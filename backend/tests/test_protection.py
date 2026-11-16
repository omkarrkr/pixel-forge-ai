"""Run with: python -m unittest discover -s tests -v (from backend/)."""

import asyncio
import io
import os
import unittest
import httpx
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from src.protection import GenerationGuard, Limits

# Never construct a real provider client or use credentials during tests.
with patch.dict(os.environ, {"GEMINI_API_KEY": "test-only"}), patch("google.genai.Client"):
    from src import server


def screenshot(format="PNG", size=(32, 24)):
    output = io.BytesIO()
    Image.new("RGB", size, "white").save(output, format=format)
    return output.getvalue()


class GenerationTests(unittest.TestCase):
    def setUp(self):
        self.limits = replace(Limits(), max_upload_bytes=1024, max_image_pixels=4096,
                              max_image_dimension=128)
        app = FastAPI()
        app.include_router(server.app.router)
        app.exception_handlers.update(server.app.exception_handlers)
        app.add_middleware(GenerationGuard, limits=self.limits)
        self.http = TestClient(app)
        self.settings = patch.object(server, "limits", self.limits)
        self.settings.start()
        self.addCleanup(self.settings.stop)
        self.provider = Mock()
        self.provider.interactions.create = AsyncMock()
        self.provider.aio.interactions.create = self.provider.interactions.create
        self.provider.interactions.create.return_value = SimpleNamespace(
            output_text="```jsx\nexport default function App() { return <h1>Hello</h1>; }\n```"
        )
        self.provider_patch = patch.object(server, "client", self.provider)
        self.provider_patch.start()
        self.addCleanup(self.provider_patch.stop)

    def upload(self, data, mime="image/png"):
        return self.http.post("/generate", files={"file": ("screen.png", data, mime)})

    def assert_rejected(self, data, status, mime="image/png"):
        response = self.upload(data, mime)
        self.assertEqual(response.status_code, status, response.text)
        self.assertIn("error", response.json())
        self.provider.interactions.create.assert_not_called()

    def test_valid_formats_reach_provider_with_verified_mime(self):
        for format, mime in [("PNG", "image/png"), ("JPEG", "image/jpeg"),
                             ("WEBP", "image/webp")]:
            with self.subTest(format=format):
                response = self.upload(screenshot(format), mime)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertTrue(response.json()["code"].startswith("export default"))
                call = self.provider.interactions.create.call_args.kwargs
                self.assertEqual(call["input"][1]["mime_type"], mime)

    def test_empty_upload(self):
        self.assert_rejected(b"", 400)

    def test_fake_png(self):
        self.assert_rejected(b"This is not an image", 400)

    def test_unsupported_type(self):
        self.assert_rejected(b"<svg></svg>", 415, "image/svg+xml")

    def test_mislabeled_image(self):
        self.assert_rejected(screenshot("JPEG"), 415)

    def test_oversized_file(self):
        self.assert_rejected(b"x" * 1025, 413)

    def test_excessive_pixel_count(self):
        self.assert_rejected(screenshot(size=(100, 100)), 413)

    def test_excessive_dimension(self):
        self.assert_rejected(screenshot(size=(129, 1)), 413)

    def test_corrupt_image(self):
        self.assert_rejected(screenshot()[:40], 400)

    def test_animated_image(self):
        output = io.BytesIO()
        Image.new("RGB", (10, 10), "red").save(
            output, format="PNG", save_all=True,
            append_images=[Image.new("RGB", (10, 10), "blue")], duration=100, loop=0
        )
        self.assert_rejected(output.getvalue(), 415)

    def test_client_rate_limit_and_retry_header(self):
        for _ in range(5):
            self.upload(b"invalid")
        response = self.upload(screenshot())
        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response.headers["Retry-After"]), 0)
        self.provider.interactions.create.assert_not_called()

    def test_test_endpoint_removed_and_health_is_free(self):
        self.assertEqual(self.http.get("/test-gemini").status_code, 404)
        self.assertEqual(self.http.get("/").status_code, 200)
        self.provider.interactions.create.assert_not_called()

    def test_provider_error_is_safe_and_slot_is_released(self):
        self.provider.interactions.create.side_effect = RuntimeError("private-provider-detail")
        with self.assertLogs(server.logger, level="ERROR"):
            response = self.upload(screenshot())
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("private-provider-detail", response.text)
        self.provider.interactions.create.side_effect = None
        self.assertEqual(self.upload(screenshot()).status_code, 200)

    def test_empty_generation_is_rejected(self):
        self.provider.interactions.create.return_value = SimpleNamespace(output_text="```jsx\n\n```")
        response = self.upload(screenshot())
        self.assertEqual(response.status_code, 502)
        self.assertIn("No code", response.json()["error"])

    def test_wrapped_provider_timeout_returns_504(self):
        error = RuntimeError("SDK wrapper")
        error.__cause__ = httpx.ReadTimeout("private timeout detail")
        self.provider.interactions.create.side_effect = error
        response = self.upload(screenshot())
        self.assertEqual(response.status_code, 504)
        self.assertNotIn("private timeout detail", response.text)

    def test_generation_deadline_cancels_provider_and_releases_slot(self):
        cancelled = []

        async def slow(**kwargs):
            try:
                await asyncio.sleep(10)
            finally:
                cancelled.append(True)

        self.provider.interactions.create.side_effect = slow
        with patch.object(server, "generation_timeout", 0.02):
            response = self.upload(screenshot())
        self.assertEqual(response.status_code, 504)
        self.assertEqual(cancelled, [True])
        self.provider.interactions.create.side_effect = None
        self.assertEqual(self.upload(screenshot()).status_code, 200)

    def test_validation_error_has_cors_headers(self):
        # Exercise the actual production middleware order as well.
        server.app.middleware_stack = None
        response = TestClient(server.app).post(
            "/generate", files={"file": ("x.png", b"invalid", "image/png")},
            headers={"Origin": "http://localhost:5173"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.headers["access-control-allow-origin"],
                         "http://localhost:5173")


class GuardTests(unittest.IsolatedAsyncioTestCase):
    async def test_client_disconnect_cancels_provider(self):
        provider = AsyncMock(side_effect=lambda **kwargs: None)
        cancelled = asyncio.Event()

        async def slow(**kwargs):
            try:
                await asyncio.sleep(10)
            finally:
                cancelled.set()

        provider.side_effect = slow
        request = Mock()
        request.receive = AsyncMock(return_value={"type": "http.disconnect"})
        with patch.object(server.client.aio.interactions, "create", provider):
            with self.assertRaises(server.HTTPException) as error:
                await server.call_provider(request)
        self.assertEqual(error.exception.status_code, 499)
        self.assertTrue(cancelled.is_set())

    async def call(self, guard, chunks=(b"ok",), headers=(), client="one"):
        messages = []
        iterator = iter(chunks)

        async def receive():
            try:
                chunk = next(iterator)
                return {"type": "http.request", "body": chunk, "more_body": True}
            except StopIteration:
                return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            messages.append(message)

        await guard({"type": "http", "path": "/generate", "method": "POST",
                     "headers": headers, "client": (client, 123)}, receive, send)
        return messages

    async def downstream(self, scope, receive, send):
        await receive()
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    async def test_chunked_body_limit_without_content_length(self):
        downstream = Mock()
        guard = GenerationGuard(downstream, replace(Limits(), max_upload_bytes=10))
        messages = await self.call(guard, chunks=(b"x" * 65536, b"x" * 11))
        self.assertEqual(messages[0]["status"], 413)
        downstream.assert_not_called()
        self.assertEqual(guard.active, 0)

    async def test_content_length_rejected_before_reading(self):
        guard = GenerationGuard(Mock(), Limits())
        messages = await self.call(guard, headers=[(b"content-length", b"999999999")])
        self.assertEqual(messages[0]["status"], 413)
        self.assertEqual(guard.active, 0)

    async def test_global_budget_across_clients_and_expiry(self):
        guard = GenerationGuard(self.downstream, replace(Limits(), requests_per_hour=1))
        with patch("src.protection.time.monotonic", return_value=10000):
            self.assertEqual((await self.call(guard))[0]["status"], 200)
            self.assertEqual((await self.call(guard, client="two"))[0]["status"], 429)
        with patch("src.protection.time.monotonic", return_value=13601):
            self.assertEqual((await self.call(guard, client="two"))[0]["status"], 200)

    async def test_concurrency_cap_and_release(self):
        entered, release = asyncio.Event(), asyncio.Event()

        async def blocked(scope, receive, send):
            entered.set()
            await release.wait()
            await self.downstream(scope, receive, send)

        guard = GenerationGuard(blocked, replace(Limits(), concurrent_requests=1))
        first = asyncio.create_task(self.call(guard))
        try:
            await asyncio.wait_for(entered.wait(), 2)
            response = await self.call(guard, client="two")
            self.assertEqual(response[0]["status"], 503)
        finally:
            release.set()
            await first
        self.assertEqual(guard.active, 0)

    async def test_upload_timeout_releases_capacity(self):
        guard = GenerationGuard(Mock(), replace(Limits(), upload_timeout_seconds=0.01))

        async def stalled():
            await asyncio.sleep(1)

        messages = []

        async def send(message):
            messages.append(message)

        await guard({"type": "http", "path": "/generate", "method": "POST",
                     "headers": [], "client": ("one", 123)}, stalled, send)
        self.assertEqual(messages[0]["status"], 408)
        self.assertEqual(guard.active, 0)


if __name__ == "__main__":
    unittest.main()
