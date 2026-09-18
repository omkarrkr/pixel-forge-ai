import os
import base64

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in the .env file")

client = genai.Client(api_key=api_key)


@app.get("/")
def home():
    return {
        "message": "PixelForge AI backend is running 🚀"
    }


@app.get("/test-gemini")
def test_gemini():
    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input="Say hello to PixelForge AI in one short sentence."
    )

    return {
        "response": interaction.output_text
    }


@app.post("/generate")
async def generate_code(file: UploadFile = File(...)):

    try:
        image_bytes = await file.read()

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

        interaction = client.interactions.create(
            model="gemini-3.6-flash",
            input=[
                {
                    "type": "text",
                    "text": prompt
                },
                {
                    "type": "image",
                    "data": image_base64,
                    "mime_type": file.content_type or "image/png"
                }
            ],
            generation_config={
                "thinking_level": "low"
            }
        )

        code = interaction.output_text.strip()

        if code.startswith("```"):
            lines = code.splitlines()

            if lines and lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            code = "\n".join(lines).strip()

        return {
            "code": code
        }

    except Exception as error:
        print("❌ Generation error:", repr(error))

        return {
            "error": str(error)
        }