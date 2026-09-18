import { useRef, useState } from "react";
import LivePreview from "./LivePreview";

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setGenerationError("Please upload a valid image file.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setSelectedImage(imageUrl);
    setGeneratedCode("");
    setGenerationError("");
    setIsCopied(false);
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    handleFile(file);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    handleFile(file);
  };

  const changeScreenshot = () => {
    setSelectedFile(null);
    setSelectedImage(null);
    setGeneratedCode("");
    setGenerationError("");
    setIsCopied(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    fileInputRef.current?.click();
  };

  const generateCode = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    setGeneratedCode("");
    setGenerationError("");
    setIsCopied(false);

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
        throw new Error(
          data.error || "Failed to generate code"
        );
      }

      setGeneratedCode(data.code);
    } catch (error) {
      console.error("Generation failed:", error);

      setGenerationError(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the code."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!generatedCode) return;

    try {
      await navigator.clipboard.writeText(generatedCode);

      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const downloadCode = () => {
    if (!generatedCode) return;

    const blob = new Blob(
      [generatedCode],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "PixelForgeGenerated.jsx";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">

      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute left-1/2 top-[-250px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[140px]" />

        <div className="absolute bottom-[-200px] left-[-100px] h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />

      </div>

      <main className="relative mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">

        {/* Navbar */}
        <header className="mb-16 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-950 shadow-lg shadow-white/10">
              ⚡
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                PixelForge AI
              </h1>

              <p className="text-xs text-slate-500">
                Screenshot → Code
              </p>
            </div>

          </div>

          <div className="hidden rounded-full border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-400 sm:block">
            AI-Powered UI Generation
          </div>

        </header>

        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs text-slate-400 backdrop-blur">

            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            Powered by Gemini Vision

          </div>

          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl">

            Turn screenshots into

            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
              beautiful frontend code.
            </span>

          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Upload a screenshot and let AI analyze its layout,
            styling, and components to generate a React + Tailwind
            implementation.
          </p>

        </section>

        {/* Upload Section */}
        <section className="mx-auto mt-12 max-w-4xl">

          {!selectedImage ? (

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 sm:p-16 ${
                isDragging
                  ? "scale-[1.01] border-violet-400 bg-violet-500/10"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70"
              }`}
            >

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/70 text-4xl shadow-xl transition-transform duration-300 group-hover:-translate-y-1">
                📸
              </div>

              <h3 className="mt-7 text-xl font-semibold">
                {isDragging
                  ? "Drop your screenshot here"
                  : "Upload a screenshot"}
              </h3>

              <p className="mt-3 text-sm text-slate-400">
                Drag & drop your image here or click to browse
              </p>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-600">
                <span>PNG</span>
                <span>•</span>
                <span>JPG</span>
                <span>•</span>
                <span>WEBP</span>
              </div>

            </div>

          ) : (

            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/20">

              {/* Screenshot Header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

                <div>
                  <p className="text-sm font-medium">
                    Screenshot
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Ready for AI analysis
                  </p>
                </div>

                <button
                  onClick={changeScreenshot}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
                >
                  Change
                </button>

              </div>

              {/* Image */}
              <div className="bg-black/30 p-4 sm:p-6">

                <img
                  src={selectedImage}
                  alt="Selected screenshot"
                  className="mx-auto max-h-[550px] w-full rounded-2xl object-contain"
                />

              </div>

            </div>

          )}

          {/* Hidden Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Generate Button */}
          {selectedImage && (

            <div className="mt-8 flex flex-col items-center">

              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="group inline-flex items-center gap-3 rounded-xl bg-white px-8 py-3.5 font-semibold text-slate-950 shadow-xl shadow-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {isGenerating ? (

                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950" />

                    Generating...
                  </>

                ) : (

                  <>
                    <span className="transition-transform duration-200 group-hover:rotate-12">
                      ✨
                    </span>

                    Generate Code
                  </>

                )}

              </button>

              {isGenerating && (

                <div className="mt-4 text-center">

                  <p className="text-sm text-slate-400">
                    AI is analyzing your screenshot...
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    This may take a moment
                  </p>

                </div>

              )}

            </div>

          )}

        </section>

        {/* Error */}
        {generationError && (

          <section className="mx-auto mt-8 max-w-4xl">

            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

              <div className="flex gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                  ⚠️
                </div>

                <div className="min-w-0">

                  <h3 className="font-semibold text-red-400">
                    Generation failed
                  </h3>

                  <p className="mt-2 break-words text-sm leading-6 text-slate-400">
                    {generationError}
                  </p>

                </div>

              </div>

            </div>

          </section>

        )}

        {/* Generated Website */}
        {generatedCode && (

          <section className="mt-20">

            {/* Section Header */}
            <div className="mb-7">

              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="h-8 w-1 rounded-full bg-violet-400" />

                  <h2 className="text-2xl font-bold">
                    Generated Website
                  </h2>

                </div>

                <button
                  onClick={changeScreenshot}
                  className="hidden rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white sm:block"
                >
                  ↗ Change Screenshot
                </button>

              </div>

              <p className="mt-2 text-sm text-slate-500">
                Your screenshot has been transformed into React code.
              </p>

            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* Generated Code */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">

                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">
                      💻
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Generated Code
                      </h3>

                      <p className="text-xs text-slate-600">
                        React + Tailwind
                      </p>
                    </div>

                  </div>

                  {/* Code Actions */}
                  <div className="flex items-center gap-2">

                    <button
                      onClick={copyCode}
                      className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                    >
                      {isCopied ? "✓ Copied" : "📋 Copy"}
                    </button>

                    <button
                      onClick={downloadCode}
                      className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                    >
                      ⬇ Download
                    </button>

                  </div>

                </div>

                <pre className="h-[600px] overflow-auto bg-[#020617] p-5 text-left text-sm leading-6 text-emerald-300">

                  <code>{generatedCode}</code>

                </pre>

              </div>

              {/* Live Preview */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">

                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-sm">
                      🌐
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Live Preview
                      </h3>

                      <p className="text-xs text-slate-600">
                        Interactive generated UI
                      </p>
                    </div>

                  </div>

                </div>

                <div className="bg-white">
                  <LivePreview code={generatedCode} />
                </div>

              </div>

            </div>

          </section>

        )}

        {/* Footer */}
        <footer className="mt-24 border-t border-slate-900 py-8 text-center">

          <p className="text-xs text-slate-600">
            PixelForge AI • Built with React, FastAPI, Gemini & Sandpack
          </p>

        </footer>

      </main>
    </div>
  );
}

export default App;