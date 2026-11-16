"""Small, single-process upload and request guards for the MVP."""

import asyncio
import io
import math
import os
import time
from collections import deque
from dataclasses import dataclass

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from starlette.responses import JSONResponse


def positive_setting(name: str, default: int) -> int:
    value = int(os.getenv(name, str(default)))
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    return value


@dataclass(frozen=True)
class Limits:
    max_upload_bytes: int = 5 * 1024 * 1024
    max_image_pixels: int = 16_000_000
    max_image_dimension: int = 8192
    requests_per_minute: int = 5
    requests_per_hour: int = 100
    concurrent_requests: int = 2
    upload_timeout_seconds: int = 15

    @classmethod
    def from_env(cls):
        return cls(**{
            field: positive_setting(field.upper(), default)
            for field, default in vars(cls()).items()
        })


def validate_image(data: bytes, content_type: str | None, limits: Limits) -> str:
    """Decode the image instead of trusting the filename or browser MIME type."""
    formats = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}
    if not data:
        raise HTTPException(400, "The screenshot is empty.")
    if len(data) > limits.max_upload_bytes:
        raise HTTPException(413, "The screenshot exceeds the upload size limit.")
    if content_type not in formats.values():
        raise HTTPException(415, "Upload a PNG, JPEG, or WebP screenshot.")
    try:
        with Image.open(io.BytesIO(data), formats=list(formats)) as image:
            mime = formats.get(image.format)
            if mime != content_type:
                raise HTTPException(415, "The image contents do not match its file type.")
            width, height = image.size
            if (max(width, height) > limits.max_image_dimension
                    or width * height > limits.max_image_pixels):
                raise HTTPException(413, "The screenshot dimensions are too large.")
            if getattr(image, "is_animated", False):
                raise HTTPException(415, "Upload a still screenshot, not an animated image.")
            image.verify()
        # verify() checks file integrity; load() also catches truncated pixel data.
        with Image.open(io.BytesIO(data), formats=list(formats)) as image:
            image.load()
        return mime
    except Image.DecompressionBombError:
        raise HTTPException(413, "The screenshot dimensions are too large.") from None
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise HTTPException(400, "The screenshot is damaged or is not a valid image.") from None


class GenerationGuard:
    """Bound requests before multipart parsing. State resets on process restart.

    All counters run on the ASGI event loop, with no await between check/reserve.
    Only scope['client'] is trusted; forwarded headers are the server's concern.
    """

    def __init__(self, app, limits: Limits):
        self.app = app
        self.limits = limits
        self.clients = {}
        self.hourly = deque()
        self.active = 0

    async def __call__(self, scope, receive, send):
        if (scope["type"] != "http" or scope["path"].rstrip("/") != "/generate"
                or scope["method"] != "POST"):
            return await self.app(scope, receive, send)

        async def reject(status, message, retry=None):
            headers = {"Retry-After": str(retry)} if retry is not None else None
            await JSONResponse({"error": message}, status_code=status, headers=headers)(
                scope, receive, send
            )

        now = time.monotonic()
        for key in list(self.clients):
            times = self.clients[key]
            while times and times[0] <= now - 60:
                times.popleft()
            if not times:
                del self.clients[key]
        while self.hourly and self.hourly[0] <= now - 3600:
            self.hourly.popleft()
        client = (scope.get("client") or ("unknown", 0))[0]
        times = self.clients.get(client, deque())
        if len(times) >= self.limits.requests_per_minute:
            return await reject(429, "Too many requests. Please try again shortly.",
                                max(1, math.ceil(60 - (now - times[0]))))
        if len(self.hourly) >= self.limits.requests_per_hour:
            return await reject(429, "The hourly generation request limit has been reached.",
                                max(1, math.ceil(3600 - (now - self.hourly[0]))))
        if self.active >= self.limits.concurrent_requests:
            return await reject(503, "The generator is busy. Please try again shortly.", 5)
        times.append(now)
        self.clients[client] = times
        self.hourly.append(now)
        self.active += 1
        try:
            # Allow bounded multipart overhead in addition to the image itself.
            body_limit = self.limits.max_upload_bytes + 64 * 1024
            headers = dict(scope["headers"])
            length = headers.get(b"content-length")
            if length is not None:
                try:
                    length = int(length)
                    if length < 0:
                        raise ValueError
                except ValueError:
                    return await reject(400, "Invalid request size.")
                if length > body_limit:
                    return await reject(413, "The upload request is too large.")

            async def read_body():
                body = bytearray()
                while True:
                    message = await receive()
                    if message["type"] == "http.disconnect":
                        return None
                    chunk = message.get("body", b"")
                    if len(body) + len(chunk) > body_limit:
                        raise OverflowError
                    body.extend(chunk)
                    if not message.get("more_body", False):
                        return bytes(body)

            try:
                body = await asyncio.wait_for(read_body(), self.limits.upload_timeout_seconds)
            except OverflowError:
                return await reject(413, "The upload request is too large.")
            except TimeoutError:
                return await reject(408, "The upload took too long. Please try again.")
            if body is None:
                return
            delivered = False

            async def replay():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": body, "more_body": False}
                return await receive()

            await self.app(scope, replay, send)
        finally:
            self.active -= 1
