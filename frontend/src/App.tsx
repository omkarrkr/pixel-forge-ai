import { useRef, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { GenerationRequest } from "./generation";
import { useTheme } from "./useTheme";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const LivePreview = lazy(() => import("./LivePreview"));

function App() {
  const { theme, preference, chooseTheme } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [originalCode, setOriginalCode] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generation] = useState(() => new GenerationRequest({
    onBusy: setIsGenerating,
    onError: setGenerationError,
    onCode: code => { setGeneratedCode(code); setOriginalCode(code); },
  }));

  useEffect(() => () => generation.cancel(false), [generation]);
  useEffect(() => () => { if (selectedImage) URL.revokeObjectURL(selectedImage); }, [selectedImage]);
  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [isCopied]);
  const cancelGeneration = useCallback(() => generation.cancel(), [generation]);

  const handleFile = (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setGenerationError("Choose a PNG, JPG, or WebP screenshot.");
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    cancelGeneration();
    setSelectedFile(file);
    setSelectedImage(imageUrl);
    setGeneratedCode("");
    setOriginalCode("");
    setGenerationError("");
    setCopyError("");
    setIsCopied(false);
  };
  const chooseScreenshot = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };
  const generateCode = useCallback(async () => {
    if (!selectedFile) return;
    setIsCopied(false);
    setCopyError("");
    await generation.generate(selectedFile, `${API_URL}/generate`);
  }, [selectedFile, generation]);
  const copyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setIsCopied(true);
      setCopyError("");
    } catch {
      setCopyError("Clipboard access failed. Select the code in the editor or download the file.");
    }
  };
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea, [contenteditable='true'], .cm-editor")) return;
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && selectedFile && !isGenerating) {
        event.preventDefault();
        void generateCode();
      }
      if (event.key === "Escape") cancelGeneration();
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedFile, isGenerating, generateCode, cancelGeneration]);
  const downloadCode = () => {
    if (!generatedCode) return;
    const url = URL.createObjectURL(new Blob([generatedCode], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "PixelForgeGenerated.jsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <header className="site-header"><div className="header-inner">
        <a href="#" className="brand" aria-label="PixelForge home">
          <svg width="27" height="27" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 4h9v9H4zM15 4h9v9h-9zM4 15h9v9H4z" fill="currentColor"/><path d="M15 15h9v9h-9z" fill="currentColor" opacity=".3"/></svg>
          <span>PixelForge<span className="brand-ai"> / AI</span></span>
        </a>
        <nav aria-label="Main navigation" className="header-nav">
          <a href="#guide" className="guide-link">How it works</a>
          <a href="https://github.com/omkarrkr/pixel-forge-ai" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          <label className="theme-control">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
            <span className="sr-only">Color theme</span>
            <select value={preference} onChange={event => chooseTheme(event.target.value as "light" | "dark" | "system")}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </label>
        </nav>
      </div></header>
      <main className="main-content">
        <div className="intro"><div>
          <p className="eyebrow"><span className="eyebrow-line"/> FROM REFERENCE TO REACT</p>
          <h1>Your screenshot.<br/>Your next starting point.</h1>
          <p className="intro-copy">Recreate an interface in React and Tailwind.<br className="desktop-break"/> Preview it, refine the details, and make it yours.</p>
        </div></div>

        <div className="studio-frame" id="workspace">
        <div className="studio-heading"><span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg> Interface studio</span><span className="session-label">{isGenerating ? "Generating" : originalCode ? "Ready to refine" : "New session"}</span></div>
        <div className="workspace">
          <section className="reference-panel" aria-labelledby="reference-heading">
            <div className="panel-heading"><h2 id="reference-heading"><span className="step-number">01</span> Reference</h2>{selectedImage && <button className="text-button" onClick={chooseScreenshot}>Replace</button>}</div>
            <div className="reference-content">
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-label="Choose screenshot" onChange={event => { const file = event.target.files?.[0]; if (file) handleFile(file); }}/>
              <button type="button" className={`upload-surface ${selectedImage ? "has-image" : ""} ${isDragging ? "is-dragging" : ""}`}
                onClick={chooseScreenshot} aria-label={selectedImage ? "Replace reference screenshot" : "Upload or drop a screenshot"} aria-describedby="upload-requirements"
                onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false); }}
                onDrop={event => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) handleFile(file); }}>
                {selectedImage ? <img src={selectedImage} alt="Reference screenshot"/> : <>
                  <span className="upload-symbol" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></span>
                  <strong>{isDragging ? "Drop your screenshot here" : "Add a screenshot"}</strong>
                  <span>Drop a screenshot, or <span className="upload-link">browse files</span></span>
                </>}
              </button>
              {selectedFile && <div className="file-details"><span title={selectedFile.name}>{selectedFile.name}</span><span>{(selectedFile.size / 1024).toFixed(0)} KB</span></div>}
              <p className="input-hint" id="upload-requirements">PNG, JPG or WebP · Default limit: 5 MB</p>
              <button className="primary-button generate-button" disabled={!selectedFile || isGenerating} onClick={() => { void generateCode(); }}>
                {isGenerating ? <><span className="spinner" aria-hidden="true"/> Generating…</> : <>{originalCode ? "Regenerate interface" : "Generate interface"}<span aria-hidden="true">→</span></>}
              </button>
              {isGenerating ? <div className="generation-status" role="status"><p>Reconstructing your interface.</p><button className="text-button" onClick={cancelGeneration}>Cancel generation</button></div> : <p className="keyboard-hint"><kbd>Ctrl / ⌘</kbd> <kbd>Enter</kbd> to generate</p>}
              {generationError && <div role="alert" className="error-notice"><strong>Generation needs attention</strong><p>{generationError}</p></div>}
              <div className="reference-note"><span aria-hidden="true">↳</span><p>Start with a clear reference. Fonts, images, and interactions may need a finishing touch.</p></div>
            </div>
          </section>

          <section className="output-panel" aria-labelledby="output-heading" aria-busy={isGenerating}>
            <div className="panel-heading output-heading"><h2 id="output-heading"><span className="step-number">02</span> Your interface</h2>
              {originalCode && <div className="output-actions"><button className="secondary-button" onClick={copyCode} disabled={!generatedCode}>{isCopied ? "Copied!" : "Copy code"}</button><button className="secondary-button" onClick={downloadCode} disabled={!generatedCode}>Download .jsx <span aria-hidden="true">↓</span></button></div>}
            </div>
            <span className="sr-only" role="status">{isCopied ? "Code copied to clipboard." : ""}</span>
            {copyError && <p role="alert" className="error-notice">{copyError}</p>}
            {originalCode ? <Suspense fallback={<div className="output-empty" role="status">Loading editor and preview…</div>}><LivePreview code={generatedCode} originalCode={originalCode} onCodeChange={setGeneratedCode} theme={theme}/></Suspense> : <div className="output-empty">
              <div className="empty-window" aria-hidden="true"><div className="empty-window-top"><span/><span/></div><div className="empty-window-body"><div className="empty-line long"/><div className="empty-line"/><div className="empty-columns"><div/><div/></div><div className="empty-small-button"/></div></div>
              <p className="empty-kicker">{isGenerating ? "GENERATION IN PROGRESS" : "READY WHEN YOU ARE"}</p>
              <h3>{isGenerating ? "Recreating your interface." : "Your interface starts here."}</h3>
              <p>{isGenerating ? "Your component will appear here. You can cancel at any time." : "Add a screenshot to get started. Your code and live preview will appear here."}</p>
            </div>}
          </section>
        </div>
        <div className="studio-footer"><span>React JSX <span aria-hidden="true">/</span> Tailwind CSS</span><span>Unsaved session · Download to keep your work</span></div>
        </div>

        <section className="workflow-guide" id="guide" aria-label="How it works">
          {[
            ["01", "Bring a reference", "Upload a page, a dashboard, or a single UI detail."],
            ["02", "Refine the details", "Compare your preview. Edit the code. Find the right fit."],
            ["03", "Make it part of your project", "Copy or download the component for your React and Tailwind setup."],
          ].map(([number, title, description]) => <div key={number}><span className="guide-number">{number}</span><h3>{title}</h3><p>{description}</p></div>)}
        </section>
      </main>
      <footer className="site-footer"><span>PixelForge AI</span><p>Built by Omkar Kumar</p><span>Screenshot → React</span></footer>
    </div>
  );
}

export default App;
