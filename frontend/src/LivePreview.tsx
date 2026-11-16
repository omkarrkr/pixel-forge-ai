import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useEffect, useRef, useMemo, useState } from "react";
import { validateGeneratedCode } from "./validateCode";

interface LivePreviewProps {
  code: string;
  originalCode: string;
  theme: "light" | "dark";
  onCodeChange?: (code: string) => void;
}

/** Syncs sandpack edits back to parent without re-render loops */
function CodeChangeListener({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const { sandpack } = useSandpack();
  const lastEmitted = useRef<string>("");

  useEffect(() => {
    const current = sandpack.files["/App.js"]?.code ?? "";
    if (current !== lastEmitted.current) {
      lastEmitted.current = current;
      onCodeChange(current);
    }
  }, [sandpack.files, onCodeChange]);

  return null;
}

type View = "preview" | "code" | "split";

function PreviewRecovery({ originalCode, view, onViewChange }: { originalCode: string; view: View; onViewChange: (view: View) => void }) {
  const { sandpack } = useSandpack();
  const current = sandpack.files["/App.js"]?.code ?? "";
  const validation = useMemo(() => validateGeneratedCode(current), [current]);
  const error = validation || sandpack.error?.message ||
    (sandpack.status === "timeout" ? "The preview could not connect. Check your connection, then restart the preview." : "");

  return (
    <>
      <div className="preview-toolbar">
        <div className="preview-tabs" role="group" aria-label="Workspace view">
          {(["preview", "code", "split"] as const).map(option => <button key={option} aria-pressed={view === option} onClick={() => onViewChange(option)}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>)}
        </div>
        <div className="recovery-actions">
          <button onClick={() => { void sandpack.runSandpack(); }} className="secondary-button">Restart preview</button>
          <button onClick={() => sandpack.updateFile("/App.js", originalCode)} disabled={current === originalCode} className="secondary-button">Restore generated code</button>
        </div>
      </div>
      {error && (
        <div role="alert" className="error-notice preview-error">
          <strong>Preview needs attention</strong>
          <p>{error}</p>
          <p>Your code is still available. Open Code to fix it, or restore the generated version.</p>
        </div>
      )}
      {current !== originalCode && <p className="recovery-help">Restore replaces your edits with the latest generated version.</p>}
    </>
  );
}

function LivePreview({ code, originalCode, onCodeChange, theme }: LivePreviewProps) {
  const [view, setView] = useState<View>("preview");
  if (!originalCode) {
    return (
      <div className="output-empty">
        Generate code to see the preview.
      </div>
    );
  }

  return (
    <SandpackProvider
      key={originalCode}
      template="react"
      files={{ "/App.js": { code } }}
      customSetup={{ dependencies: { "lucide-react": "latest" } }}
      options={{ externalResources: ["https://cdn.tailwindcss.com"] }}
      theme={theme}
    >
      {onCodeChange && <CodeChangeListener onCodeChange={onCodeChange} />}
      <PreviewRecovery originalCode={originalCode} view={view} onViewChange={setView} />

      {/* SandpackLayout handles the split correctly — no overflow-hidden wrapper needed */}
      <div className={`preview-layout ${view}-only`}>
      <SandpackLayout style={{ borderRadius: 0, border: 0 }}>
        <SandpackCodeEditor
          showTabs={false}
          showLineNumbers={true}
          showInlineErrors={true}
          wrapContent={false}
          style={{ height: 540, fontSize: "12.5px", flex: 1 }}
        />
        <SandpackPreview
          showNavigator={false}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
          showRestartButton={true}
          showSandpackErrorOverlay={true}
          style={{ height: 540, flex: 1 }}
        />
      </SandpackLayout>
      </div>
    </SandpackProvider>
  );
}

export default LivePreview;
