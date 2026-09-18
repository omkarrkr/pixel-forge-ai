import { useState } from "react";
import LivePreview from "./LivePreview";

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setSelectedImage(imageUrl);
    setGeneratedCode("");
  };

  const removeImage = () => {
    setSelectedFile(null);
    setSelectedImage(null);
    setGeneratedCode("");
  };

  const generateCode = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    setGeneratedCode("");

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await fetch(
        "http://localhost:8000/generate",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

if (!response.ok || data.error) {
  throw new Error(data.error || "Failed to generate code");
}

setGeneratedCode(data.code);
    } catch (error) {
  console.error("Generation failed:", error);

  setGeneratedCode(
    error instanceof Error
      ? `Generation failed: ${error.message}`
      : "Generation failed."
  );
} finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-7xl text-center">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold tracking-tight">
            PixelForge AI
          </h1>

          <p className="mt-4 text-lg text-slate-400">
            Turn screenshots into beautiful frontend code
          </p>
        </div>

        {/* Upload Section */}
        {!selectedImage ? (
          <label
            htmlFor="image-upload"
            className="block cursor-pointer"
          >
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-16 hover:border-slate-500 hover:bg-slate-900 transition">
              <div className="text-5xl mb-5">📸</div>

              <h2 className="text-xl font-semibold">
                Upload your screenshot
              </h2>

              <p className="mt-2 text-slate-400">
                Click here to choose an image
              </p>

              <p className="mt-3 text-sm text-slate-500">
                PNG, JPG or WEBP
              </p>
            </div>
          </label>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <img
              src={selectedImage}
              alt="Selected screenshot"
              className="w-full max-h-[500px] object-contain rounded-xl"
            />

            <button
              onClick={removeImage}
              className="mt-5 px-5 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
            >
              Remove Screenshot
            </button>
          </div>
        )}

        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Generate Button */}
        {selectedImage && (
          <button
            onClick={generateCode}
            disabled={isGenerating}
            className="mt-8 px-8 py-3 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition disabled:opacity-50"
          >
            {isGenerating
              ? "✨ Generating..."
              : "✨ Generate Code"}
          </button>
        )}

        {/* Code + Live Preview */}
        {generatedCode && (
          <div className="mt-10 text-left">

            <h2 className="text-2xl font-semibold mb-5">
              Generated Website
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Generated Code */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-slate-300">
                  💻 Generated Code
                </h3>

                <pre className="bg-black border border-slate-800 rounded-xl p-5 overflow-auto h-[600px] text-sm text-green-300">
                  <code>{generatedCode}</code>
                </pre>
              </div>

              {/* Live Preview */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-slate-300">
                  🌐 Live Preview
                </h3>

                <div className="rounded-xl overflow-hidden">
                  <LivePreview code={generatedCode} />
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;