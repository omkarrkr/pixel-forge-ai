const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
import { useRef, useState, useEffect } from "react";
import LivePreview from "./LivePreview";
import ParticleBackground from "./ParticleBackground";

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      const response = await fetch(`${API_URL}/generate`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Failed to generate code");
      setGeneratedCode(data.code);
    } catch (error) {
      console.error("Generation failed:", error);
      setGenerationError(
        error instanceof Error ? error.message : "Something went wrong while generating the code."
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
      setShowSuccess(true);
      setTimeout(() => {
        setIsCopied(false);
        setTimeout(() => setShowSuccess(false), 2000);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter" && selectedImage && !isGenerating) generateCode();
      if (e.key === "Escape") {
        setSelectedFile(null);
        setSelectedImage(null);
        setGeneratedCode("");
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedImage, isGenerating]);

  const downloadCode = () => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: "text/plain;charset=utf-8" });
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
    <div className="min-h-screen bg-[#080810] text-white selection:bg-violet-500/30">
      {/* Particle canvas */}
      <ParticleBackground />

      {/* Ambient light blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[400px] w-[500px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[400px] rounded-full bg-purple-800/[0.05] blur-[100px]" />
      </div>

      {/* ── GLASSMORPHISM HEADER ─────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[#080810]/80 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 opacity-90" />
              <svg
                className="relative h-4 w-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2Z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
              PixelForge
            </span>
            <span className="hidden rounded-[4px] bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-violet-400 ring-1 ring-violet-500/20 sm:inline">
              Beta
            </span>
          </div>

          {/* Center nav links */}
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#how-it-works"
              className="text-[13px] font-medium text-slate-400 transition hover:text-white"
            >
              How it works
            </a>
            <a
              href="#studio"
              className="text-[13px] font-medium text-slate-400 transition hover:text-white"
            >
              Studio
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-slate-400 transition hover:text-white"
            >
              GitHub
            </a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[12px] font-medium text-slate-400">Live</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/[0.07] px-3.5 text-[13px] font-medium text-slate-200 ring-1 ring-white/[0.08] transition hover:bg-white/[0.12] hover:text-white"
            >
              Upload screenshot
              <svg className="h-3.5 w-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M7 9l5-5 5 5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ────────────────────────────────────────────── */}
      <main className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-28">

        {/* ── HERO ── */}
        <section className="mb-20 pt-8 animate-fade-in-up" id="how-it-works">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[12px] font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Gemini 2.0 Vision
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
          </div>

          {/* Main heading — left-aligned, intentionally imperfect weight mix */}
          <h1 className="mb-5 max-w-3xl text-left text-[52px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-[64px] lg:text-[72px]">
            Screenshot in.
            <br />
            <span className="text-slate-400 font-light">Frontend code out.</span>
          </h1>

          <p className="max-w-lg text-left text-[15px] leading-relaxed text-slate-500">
            Drop any UI screenshot. Get back clean React&nbsp;+&nbsp;Tailwind —
            layouts, spacing, colors, components.
          </p>

          {/* Feature chips row */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {[
              {
                label: "React + Tailwind",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2Z" />
                  </svg>
                ),
              },
              {
                label: "Pixel-accurate",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                ),
              },
              {
                label: "Live studio",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" />
                  </svg>
                ),
              },
              {
                label: "Download .jsx",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                  </svg>
                ),
              },
            ].map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-1.5 text-[12px] font-medium text-slate-500"
              >
                <span className="text-slate-600">{f.icon}</span>
                {f.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── UPLOAD ZONE ── */}
        <section
          className="mb-20 animate-fade-in-up"
          style={{ animationDelay: "0.12s" }}
        >
          {!selectedImage ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300
                ${isDragging
                  ? "border-violet-500/50 bg-violet-500/[0.04] scale-[1.01]"
                  : "border-slate-800/80 bg-[#0d0d15] hover:border-slate-700 hover:bg-[#0f0f18]"
                }
              `}
            >
              {/* Subtle grid texture */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.018]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Corner glow on hover */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-violet-500/[0.06] blur-[60px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative flex flex-col items-center justify-center px-8 py-16 text-center">
                {/* Upload icon with ring */}
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 ${
                    isDragging
                      ? "border-violet-500/40 bg-violet-500/10 scale-110"
                      : "border-slate-800 bg-slate-900/60 group-hover:border-slate-700 group-hover:scale-105"
                  }`}
                >
                  <svg
                    className={`h-6 w-6 transition-colors duration-300 ${
                      isDragging ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
                  </svg>
                </div>

                <h3 className="mb-2 text-[16px] font-semibold text-white">
                  {isDragging ? "Drop it here" : "Drop a screenshot"}
                </h3>
                <p className="mb-6 text-[13px] text-slate-600">
                  {isDragging ? "Release to upload" : "or click to browse"}
                </p>

                <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
                  <span>PNG</span>
                  <span className="text-slate-800">·</span>
                  <span>JPG</span>
                  <span className="text-slate-800">·</span>
                  <span>WEBP</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0d0d15]">
              {/* Header bar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  {/* macOS-style dots */}
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-500/70" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
                    <span className="h-3 w-3 rounded-full bg-green-500/70" />
                  </div>
                  <span className="text-[12px] font-medium text-slate-500">
                    {selectedFile?.name ?? "screenshot"}
                  </span>
                </div>
                <button
                  onClick={changeScreenshot}
                  className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-[12px] font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
                >
                  Change
                </button>
              </div>

              {/* Image preview */}
              <div className="p-5">
                <div className="overflow-hidden rounded-xl border border-slate-800/60">
                  <img
                    src={selectedImage}
                    alt="Selected screenshot"
                    className="mx-auto max-h-[480px] w-full object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Generate button */}
          {selectedImage && (
            <div className="mt-6 flex flex-col items-start gap-3">
              <button
                onClick={generateCode}
                disabled={isGenerating}
                className="group relative inline-flex h-11 items-center gap-2.5 overflow-hidden rounded-xl bg-white px-6 text-[14px] font-semibold text-slate-950 shadow-lg shadow-white/10 transition-all duration-200 hover:-translate-y-px hover:shadow-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-slate-100 via-white to-slate-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-2.5">
                  {isGenerating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                      Analyzing screenshot…
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2Z" />
                      </svg>
                      Generate Code
                    </>
                  )}
                </span>
              </button>
              {isGenerating && (
                <p className="text-[13px] text-slate-500">
                  Gemini Vision is reconstructing your UI — usually under 15s
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── ERROR ── */}
        {generationError && (
          <section className="mb-12">
            <div className="flex gap-4 rounded-xl border border-red-500/15 bg-red-950/20 p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-red-400">Generation failed</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{generationError}</p>
              </div>
            </div>
          </section>
        )}

        {/* ── STUDIO OUTPUT ── */}
        {generatedCode && (
          <section className="mt-4" id="studio">
            {/* Section label */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-px w-6 bg-slate-700" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Studio Output
                </span>
              </div>
              <button
                onClick={changeScreenshot}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-transparent px-3 py-1.5 text-[12px] font-medium text-slate-500 transition hover:border-slate-700 hover:text-slate-300"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18M3 12h18" />
                </svg>
                New screenshot
              </button>
            </div>

            {/* Studio card */}
            <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0c0c14] shadow-2xl shadow-black/40">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/30 px-5 py-3">
                <div className="flex items-center gap-3">
                  {/* dots */}
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-500/60" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <span className="h-3 w-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-[12px] font-medium text-slate-500">
                    PixelForge Studio
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCode}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                      isCopied
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                        : "border-slate-800 bg-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="11" height="11" rx="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={downloadCode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-transparent px-3 py-1.5 text-[12px] font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>

              {/* Sandpack */}
              <div className="p-3 sm:p-4">
                <LivePreview code={generatedCode} onCodeChange={setGeneratedCode} />
              </div>
            </div>
          </section>
        )}

        {/* ── FOOTER ── */}
        <footer className="mt-32 border-t border-slate-900">
          <div className="py-10">
            <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
              {/* Brand */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-white" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2Z" />
                  </svg>
                </div>
                <span className="text-[13px] font-semibold text-slate-300">PixelForge AI</span>
                <span className="text-slate-700">·</span>
                <span className="text-[12px] text-slate-600">Screenshot to Code</span>
              </div>

              {/* Stack */}
              <div className="flex items-center gap-4 text-[12px] text-slate-600">
                {["React", "FastAPI", "Gemini", "Sandpack"].map((t, i, arr) => (
                  <span key={t} className="flex items-center gap-4">
                    {t}
                    {i < arr.length - 1 && <span className="text-slate-800">·</span>}
                  </span>
                ))}
              </div>

              {/* Credit + year */}
              <div className="text-right">
                <p className="text-[12px] text-slate-600">Built by Omkar Kumar</p>
                <p className="text-[11px] text-slate-700">© {new Date().getFullYear()} PixelForge AI</p>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* ── COPY TOAST ── */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/15 bg-[#0d0d15]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all duration-400 ${
          showSuccess
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-emerald-400" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-slate-200">Copied to clipboard</p>
      </div>
    </div>
  );
}

export default App;
