import os
import base64
import logging
import asyncio
import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types
from starlette.concurrency import run_in_threadpool

from .protection import GenerationGuard, Limits, positive_setting, validate_image

load_dotenv()

app = FastAPI()
limits = Limits.from_env()
logger = logging.getLogger(__name__)

# CORS is added afterward so rejected requests also carry CORS headers.
app.add_middleware(GenerationGuard, limits=limits)


@app.exception_handler(HTTPException)
async def http_error(request: Request, error: HTTPException):
    return JSONResponse({"error": error.detail}, status_code=error.status_code,
                        headers=error.headers)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://pixel-forge-ai-bay.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in the .env file")

generation_timeout = positive_setting("GENERATION_TIMEOUT_SECONDS", 60)
client = genai.Client(api_key=api_key, http_options=types.HttpOptions(
    timeout=generation_timeout * 1000,
    # The pinned Interactions SDK maps this field to max_retries (0 = no retry).
    retry_options=types.HttpRetryOptions(attempts=0),
))


async def call_provider(request: Request, **kwargs):
    async def disconnected():
        # Multipart parsing has consumed the body. Listen directly for disconnect
        # without polling is_disconnected(), whose cancel scope can swallow task
        # cancellation when the provider completes at the same instant.
        while True:
            message = await request.receive()
            if message["type"] == "http.disconnect":
                return

    generation = asyncio.create_task(client.aio.interactions.create(
        **kwargs, timeout=float(generation_timeout)
    ))
    disconnect = asyncio.create_task(disconnected())
    try:
        done, _ = await asyncio.wait(
            {generation, disconnect}, timeout=generation_timeout,
            return_when=asyncio.FIRST_COMPLETED,
        )
        if disconnect in done:
            raise HTTPException(499, "Generation was cancelled by the client.")
        if generation not in done:
            raise HTTPException(504, "Generation timed out. Please try again shortly.")
        return await generation
    except TimeoutError:
        raise HTTPException(504, "Generation timed out. Please try again shortly.") from None
    except Exception as error:
        # The Interactions SDK wraps transport errors; preserve timeout semantics.
        cause = error
        seen = set()
        while cause is not None and id(cause) not in seen:
            seen.add(id(cause))
            if isinstance(cause, (httpx.TimeoutException, TimeoutError)):
                raise HTTPException(504, "Generation timed out. Please try again shortly.") from None
            cause = cause.__cause__
        raise
    finally:
        for task in (generation, disconnect):
            if not task.done():
                task.cancel()
        await asyncio.gather(generation, disconnect, return_exceptions=True)


@app.get("/")
def home():
    return {
        "message": "PixelForge AI backend is running 🚀"
    }


@app.post("/generate")
async def generate_code(request: Request, file: UploadFile = File(...)):

    try:
        try:
            image_bytes = await file.read(limits.max_upload_bytes + 1)
        finally:
            await file.close()
        mime_type = await run_in_threadpool(
            validate_image, image_bytes, file.content_type, limits
        )

        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        prompt = """
        You are an expert frontend engineer specializing in pixel-accurate screenshot-to-code reconstruction.

        Your task is to analyze the provided screenshot and recreate the WEBSITE/UI visible inside the screenshot as accurately as possible using React and Tailwind CSS.

        IMPORTANT:
        The screenshot may contain browser chrome such as:
        - browser tabs
        - address bar
        - bookmarks bar
        - browser controls
        - window borders

        IGNORE all browser chrome.

        Recreate ONLY the actual webpage/application visible inside the browser viewport.

        Before generating the code, carefully analyze the screenshot using the following visual checklist:

        1. OVERALL LAYOUT
        - Identify the main page/container dimensions.
        - Determine whether the layout is centered, full-width, fixed-width, or responsive.
        - Identify major sections and their relative positions.
        - Estimate the width and height of important elements relative to the screenshot.

        2. SPACING AND POSITIONING
        - Carefully estimate margins and padding.
        - Match the distance between elements.
        - Match vertical and horizontal alignment.
        - Pay special attention to the position of major elements such as headers, logos, search bars, buttons, cards, and footers.

        3. COLORS
        - Identify the dominant background color.
        - Identify secondary background colors.
        - Match text colors, borders, buttons, and accent colors.
        - Prefer accurate solid colors from the screenshot rather than inventing gradients.

        4. TYPOGRAPHY
        - Estimate font size for each important text element.
        - Match font weight.
        - Match line height.
        - Match letter spacing where visible.
        - Use a sensible system font when the exact font cannot be determined.

        5. COMPONENTS
        Identify visible UI elements such as:
        - navigation/header
        - logo
        - search bar
        - buttons
        - cards
        - icons
        - input fields
        - links
        - footer
        - menus
        - other visible controls

        Recreate only elements that are actually visible in the screenshot.

        6. SHAPES AND STYLING
        Match:
        - border radius
        - borders
        - shadows
        - button shapes
        - input shapes
        - icon sizes
        - element proportions
        - opacity
        - visual hierarchy

        7. RESPONSIVE BEHAVIOR
        The original screenshot represents one viewport size.

        Recreate the same appearance at that viewport size while also making the component reasonably responsive on smaller screens.

        8. VISUAL ACCURACY
        Prioritize visual similarity over adding functionality.

        Do NOT redesign the page.
        Do NOT improve the design.
        Do NOT add sections.
        Do NOT invent content.
        Do NOT change the layout unnecessarily.

        If an element is partially visible, reproduce only the visible portion.

        ASSET RULES:
        - Do not use random external images or Unsplash images.
        - Do not create unrelated placeholder images.
        - Do not use external websites as visual substitutes.
        - If a visual element can be recreated with CSS, recreate it with CSS.
        - For icons, use lucide-react when appropriate.
        - Keep the implementation self-contained.

        CODE REQUIREMENTS:
        - Generate one self-contained React component.
        - Use React JSX.
        - Use Tailwind CSS utility classes.
        - Use semantic HTML where appropriate.
        - Do not use TypeScript-specific syntax.
        - Do not require additional files.
        - Do not require a router.
        - Do not require a backend.
        - Avoid unnecessary dependencies.
        - Keep the code reasonably clean and readable.

        FUNCTIONALITY:
        Only implement simple interactions that are clearly visible or implied by the screenshot.

        Do not add functionality that is not represented in the screenshot.

        OUTPUT FORMAT:
        Return ONLY the React component code.

        Do NOT return:
        - Markdown
        - code fences
        - explanations
        - analysis
        - descriptions

        The first line of your response must be valid React code.
        """

        interaction = await call_provider(
            request,
            model="gemini-3.6-flash",
            input=[
                {
                    "type": "text",
                    "text": prompt
                },
                {
                    "type": "image",
                    "data": image_base64,
                    "mime_type": mime_type
                }
            ],
            generation_config={
                "thinking_level": "low"
            }
        )

        code = (interaction.output_text or "").strip()

        if code.startswith("```"):
            lines = code.splitlines()

            if lines and lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            code = "\n".join(lines).strip()

        if not code:
            raise HTTPException(502, "No code was generated. Please try again.")

        return {
            "code": code
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Code generation failed")
        return JSONResponse(
            {"error": "Code generation failed. Please try again shortly."},
            status_code=502,
        )
