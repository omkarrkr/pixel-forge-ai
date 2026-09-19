const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    handleFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
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
  `${API_URL}/generate`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate code");
      }

      setGeneratedCode(data.code);
    } catch (error) {
      console.error("Generation failed:", error);

      setGenerationError(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the code.",
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

    const blob = new Blob([generatedCode], {
      type: "text/plain;charset=utf-8",
    });

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
        <header className="sticky top-5 z-50 mb-16">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/70 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl sm:px-5">
            {/* Subtle navbar glow */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/[0.06] via-transparent to-blue-500/[0.06]" />

            {/* Top highlight */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative flex items-center justify-between">
              {/* Brand */}
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900 shadow-lg shadow-violet-500/10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2Z"
                      className="text-violet-400"
                    />
                  </svg>
                </div>

                {/* Brand Text */}
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-white">
                    PixelForge
                    <span className="ml-1.5 text-violet-400">AI</span>
                  </h1>

                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Screenshot to Code
                  </p>
                </div>
              </div>

              {/* Product Badge */}
              <div className="hidden items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-300 shadow-inner shadow-white/[0.03] backdrop-blur sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />

                <span>AI-Powered UI Generation</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative mx-auto -mt-2 max-w-4xl text-center">
          {/* Subtle hero glow */}
          <div className="pointer-events-none absolute left-1/2 top-8 -z-10 h-72 w-[700px] -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-[120px]" />

          {/* AI Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-slate-900/70 px-4 py-2 text-xs font-medium text-slate-300 shadow-lg shadow-violet-500/[0.04] backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Powered by Gemini Vision
          </div>

          {/* Main Heading */}
          <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-6xl lg:text-[68px]">
            Turn screenshots into
            <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
              beautiful frontend code.
            </span>
          </h2>

          {/* Description */}
          <p className="mx-auto mt-7 max-w-2xl text-[15px] leading-7 text-slate-200 sm:text-base">
            {" "}
            Upload a screenshot and let AI analyze its layout, styling, and
            components to generate a React + Tailwind implementation.
          </p>

          {/* Small supporting line */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="h-px w-8 bg-slate-800" />

            <span className="text-slate-400">
              From visual design to functional UI
            </span>

            <span className="h-px w-8 bg-slate-800" />
          </div>
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
              className={`group relative cursor-pointer overflow-hidden rounded-3xl border p-10 text-center transition-all duration-300 sm:p-16 ${
                isDragging
                  ? "scale-[1.01] border-violet-400/70 bg-violet-500/[0.08] shadow-2xl shadow-violet-500/10"
                  : "border-slate-800/90 bg-slate-900/40 shadow-2xl shadow-black/10 backdrop-blur-xl hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              {/* Subtle Card Glow */}
              <div
                className={`pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full blur-[90px] transition-opacity duration-300 ${
                  isDragging
                    ? "bg-violet-500/20 opacity-100"
                    : "bg-violet-500/10 opacity-0 group-hover:opacity-100"
                }`}
              />

              {/* Top Highlight */}
              <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Upload Icon */}
              <div
                className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border transition-all duration-300 ${
                  isDragging
                    ? "border-violet-400/40 bg-violet-500/15 shadow-lg shadow-violet-500/10"
                    : "border-slate-700 bg-slate-800/70 shadow-xl shadow-black/20 group-hover:-translate-y-1 group-hover:border-slate-600"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`h-9 w-9 transition-colors duration-300 ${
                    isDragging
                      ? "text-violet-300"
                      : "text-slate-300 group-hover:text-violet-300"
                  }`}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16V4" />
                  <path d="M7 9l5-5 5 5" />
                  <path d="M5 20h14" />
                </svg>
              </div>

              {/* Heading */}
              <h3 className="relative mt-7 text-xl font-semibold tracking-tight text-white">
                {isDragging
                  ? "Drop your screenshot here"
                  : "Upload a screenshot"}
              </h3>

              {/* Description */}
              <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">
                {isDragging
                  ? "Release to start analyzing your design"
                  : "Drag & drop your image here or click anywhere to browse"}
              </p>

              {/* Supported Formats */}
              <div className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-3.5 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <span>PNG</span>
                <span className="text-slate-700">•</span>
                <span>JPG</span>
                <span className="text-slate-700">•</span>
                <span>WEBP</span>
              </div>

              {/* Bottom Hint */}
              <p className="relative mt-5 text-[11px] text-slate-600">
                Your screenshot stays in the current session
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/60 shadow-2xl shadow-black/20 backdrop-blur-xl">
              {/* Screenshot Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 text-violet-300"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <circle cx="8.5" cy="9" r="1.5" />
                      <path d="M21 15l-5-5L5 20" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">Screenshot</p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Ready for AI analysis
                    </p>
                  </div>
                </div>

                <button
                  onClick={changeScreenshot}
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
                >
                  Change
                </button>
              </div>

              {/* Image */}
              <div className="bg-black/30 p-4 sm:p-6">
                <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/50">
                  <img
                    src={selectedImage}
                    alt="Selected screenshot"
                    className="mx-auto max-h-[550px] w-full object-contain"
                  />
                </div>
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
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white px-8 py-3.5 font-semibold text-slate-950 shadow-xl shadow-white/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* Button Glow */}
                <span className="absolute inset-0 bg-gradient-to-r from-violet-100 via-white to-blue-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <span className="relative flex items-center gap-3">
                  {isGenerating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-950 text-white transition-transform duration-200 group-hover:rotate-12">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-3.5 w-3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3v18" />
                          <path d="M3 12h18" />
                        </svg>
                      </span>
                      Generate Code
                    </>
                  )}
                </span>
              </button>

              {isGenerating && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-slate-300">
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
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 text-violet-300"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 5h16" />
                        <path d="M4 9h16" />
                        <path d="M4 13h10" />
                        <path d="M4 17h7" />
                      </svg>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white">
                        Generated Website
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        Your screenshot has been transformed into React code.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={changeScreenshot}
                  className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-300 shadow-sm transition hover:border-slate-700 hover:bg-slate-900 hover:text-white sm:flex"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-3.5 w-3.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v18" />
                    <path d="M3 12h18" />
                  </svg>
                  New Screenshot
                </button>
              </div>
            </div>

            {/* Workspace */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Generated Code */}
              <div className="group overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
                {/* Code Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/10 bg-emerald-500/10">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 text-emerald-300"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8 9l-3 3 3 3" />
                        <path d="M16 9l3 3-3 3" />
                        <path d="M14 5l-4 14" />
                      </svg>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Generated Code
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        React + Tailwind
                      </p>
                    </div>
                  </div>

                  {/* Code Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyCode}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                    >
                      {isCopied ? (
                        <>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-3.5 w-3.5 text-emerald-400"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-3.5 w-3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>

                    <button
                      onClick={downloadCode}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-3.5 w-3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3v12" />
                        <path d="M7 10l5 5 5-5" />
                        <path d="M5 21h14" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>

                {/* Code */}
                <div className="relative">
                  {/* Small top label */}
                  <div className="pointer-events-none absolute right-4 top-3 z-10 rounded-md border border-slate-800 bg-slate-950/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                    JSX
                  </div>

                  <pre className="h-[600px] overflow-auto bg-[#020617] p-5 pt-12 text-left text-sm leading-6 text-emerald-300 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>

              {/* Live Preview */}
              <div className="group overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/70 shadow-2xl shadow-black/20 backdrop-blur-xl">
                {/* Preview Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-400/10 bg-blue-500/10">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 text-blue-300"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18" />
                        <path d="M12 3a14 14 0 010 18" />
                      </svg>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Live Preview
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Interactive generated UI
                      </p>
                    </div>
                  </div>

                  {/* Live Indicator */}
                  <div className="flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-500/5 px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />

                    <span className="text-[10px] font-medium text-emerald-400">
                      LIVE
                    </span>
                  </div>
                </div>

                {/* Preview */}
                <div className="overflow-hidden bg-white">
                  <LivePreview code={generatedCode} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-28 border-t border-slate-800/70">
          <div className="relative overflow-hidden py-10">
            {/* Subtle footer glow */}
            <div className="pointer-events-none absolute bottom-[-120px] left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-violet-600/[0.06] blur-[100px]" />

            <div className="relative flex flex-col items-center justify-between gap-6 sm:flex-row">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 text-violet-400"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2Z" />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    PixelForge <span className="text-violet-400">AI</span>
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Screenshot to Code
                  </p>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
                <span>React</span>

                <span className="text-slate-700">•</span>

                <span>FastAPI</span>

                <span className="text-slate-700">•</span>

                <span>Gemini</span>

                <span className="text-slate-700">•</span>

                <span>Sandpack</span>
              </div>

              {/* Copyright */}
              <p className="text-[11px] text-slate-600">Built by Omkar Kumar</p>
            </div>

            {/* Bottom Line */}
            <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-900 pt-5 sm:flex-row">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-700">
                AI-powered frontend generation
              </p>

              <p className="text-[10px] text-slate-700">
                © {new Date().getFullYear()} PixelForge AI
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
