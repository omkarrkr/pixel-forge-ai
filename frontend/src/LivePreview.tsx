import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useEffect, useRef, useMemo } from "react";
import { validateGeneratedCode } from "./validateCode";

interface LivePreviewProps {
  code: string;
  originalCode: string;
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

function PreviewRecovery({ originalCode }: { originalCode: string }) {
  const { sandpack } = useSandpack();
  const current = sandpack.files["/App.js"]?.code ?? "";
  const validation = useMemo(() => validateGeneratedCode(current), [current]);
  const error = validation || sandpack.error?.message ||
    (sandpack.status === "timeout" ? "The preview could not connect. Check your connection, then restart the preview." : "");

  return (
    <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
      {error && (
        <div role="alert" className="mb-3 text-[13px] text-amber-200">
          <p className="font-semibold">Preview needs attention</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{error}</p>
          <p className="mt-1 text-slate-300">Your code is still available. Fix it in the editor or restore the generated version.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { void sandpack.runSandpack(); }}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-[12px] text-slate-200">
          Restart preview
        </button>
        <button onClick={() => sandpack.updateFile("/App.js", originalCode)}
          disabled={current === originalCode}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-[12px] text-slate-200 disabled:opacity-40">
          Restore generated code
        </button>
        <span className="text-[12px] text-slate-400">Restore replaces your edits with the latest generated version.</span>
      </div>
    </div>
  );
}

function LivePreview({ code, originalCode, onCodeChange }: LivePreviewProps) {
  if (!originalCode) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/50 text-[13px] text-slate-600">
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
      theme="dark"
    >
      {onCodeChange && <CodeChangeListener onCodeChange={onCodeChange} />}
      <PreviewRecovery originalCode={originalCode} />

      {/* SandpackLayout handles the split correctly — no overflow-hidden wrapper needed */}
      <SandpackLayout style={{ borderRadius: "0.75rem", border: "1px solid rgba(30,30,50,0.8)" }}>
        <SandpackCodeEditor
          showTabs={false}
          showLineNumbers={true}
          showInlineErrors={true}
          wrapContent={false}
          style={{ height: 580, fontSize: "12.5px", flex: 1 }}
        />
        <SandpackPreview
          showNavigator={false}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
          showRestartButton={true}
          showSandpackErrorOverlay={true}
          style={{ height: 580, flex: 1 }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

export default LivePreview;
