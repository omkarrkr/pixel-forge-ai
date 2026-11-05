import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackLayout,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useEffect, useRef } from "react";

interface LivePreviewProps {
  code: string;
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

function LivePreview({ code, onCodeChange }: LivePreviewProps) {
  if (!code) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/50 text-[13px] text-slate-600">
        Generate code to see the preview.
      </div>
    );
  }

  return (
    <SandpackProvider
      template="react"
      files={{ "/App.js": { code } }}
      customSetup={{ dependencies: { "lucide-react": "latest" } }}
      options={{ externalResources: ["https://cdn.tailwindcss.com"] }}
      theme="dark"
    >
      {onCodeChange && <CodeChangeListener onCodeChange={onCodeChange} />}

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
          style={{ height: 580, flex: 1 }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

export default LivePreview;
