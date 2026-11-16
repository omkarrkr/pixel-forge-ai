# Backend request protection

Install dependencies from this directory with `python -m pip install -r requirements.txt`.
Run the API with `uvicorn src.server:app --reload`.

## Defaults

- PNG, JPEG, and WebP still images only, validated by decoding with Pillow.
- Maximum image size: 5 MiB (5,242,880 bytes).
- Maximum dimensions: 8,192 pixels on either side and 16 million pixels total.
- Maximum request body: image limit plus 64 KiB for multipart overhead. This is
  enforced on streamed bodies too, before multipart parsing.
- Upload body must arrive within 15 seconds.
- 5 admitted POST `/generate` requests per client IP per rolling minute.
- 100 admitted requests across all clients per rolling hour.
- 2 simultaneous generation requests, including upload and validation time.

See `.env.example` for positive-integer settings. Existing `.env` files need no
changes unless you want to override these defaults. Restart after changing settings.

Invalid uploads consume request allowance too, protecting decoding resources.
Rate-limit responses use HTTP 429; busy responses use 503. Both include
`Retry-After` in seconds. Upload errors use 400, 408, 413, or 415, with an
`error` field compatible with the frontend. Provider failures return a safe 502.
The public `/test-gemini` endpoint has been removed; GET `/` makes no AI calls.
Image decoding runs in a thread pool; provider calls use the asynchronous SDK.
Generation has a 60-second deadline, configurable with
`GENERATION_TIMEOUT_SECONDS`. Expired generations return HTTP 504. The server
cancels its local provider task on timeout or client disconnect and releases
capacity. Provider-side processing/billing may continue after local cancellation.
Automatic retries are disabled for the pinned Interactions SDK to avoid duplicate
generation work. There is no application-level automatic retry.

## Deployment limitations

These counters are **in memory per process**. They reset on restart and are not
a persistent spending cap. Use one worker/instance for these MVP limits. Before
scaling, move rate limits and generation reservations to shared persistent storage.
Set provider-side quotas where available for an independent usage backstop.

Client IP comes from the ASGI server. Configure Uvicorn's trusted proxy settings
for your deployment; trust only the actual reverse proxy. Do not trust arbitrary
forwarded headers. If client IP forwarding is unavailable, visitors may share a
limit. CORS controls browser access, not API authentication.

The frontend waits at most 90 seconds, including upload and response transfer.
If you increase the backend deadline, update the frontend deadline in
`frontend/src/generation.ts` to leave enough time for those steps.

## Tests

From `backend/`:

```powershell
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Tests mock Gemini and require no network calls, real credentials, or API spend.
