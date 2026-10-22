import {
  SandpackCodeEditor,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";

interface LivePreviewProps {
  code: string;
  onCodeChange: (code: string) => void;
}

function LivePreview({ code }: LivePreviewProps) {
  if (!code) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-500">
        Generate code to see the live preview.
      </div>
    );
  }

  return (
    <SandpackProvider
      template="react"
      theme="dark"
      files={{
        "/App.js": {
          code,
          active: true,
        },
      }}
      customSetup={{
        dependencies: {
          "lucide-react": "latest",
        },
      }}
      options={{
        externalResources: ["https://cdn.tailwindcss.com"],
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950 shadow-2xl shadow-black/20">

        {/* Workspace Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
            </div>

            <div className="ml-3 h-4 w-px bg-slate-700" />

            <span className="text-xs font-medium text-slate-400">
              PixelForge Studio
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-400">
              React
            </span>

            <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium text-slate-400">
              Tailwind
            </span>

            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
        </div>

        {/* Code + Preview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            width: "100%",
            height: "650px",
          }}
        >
          {/* Code Editor */}
          <div
            style={{
              minWidth: 0,
              height: "650px",
              overflow: "hidden",
              background: "#0f172a",
              borderRight: "1px solid #1e293b",
            }}
          >
            <SandpackCodeEditor
              showTabs={false}
              showLineNumbers
              showInlineErrors
              wrapContent
              closableTabs={false}
              style={{
                height: "650px",
                width: "100%",
                border: "none",
                borderRadius: 0,
              }}
            />
          </div>

          {/* Live Preview */}
          <div
            style={{
              minWidth: 0,
              height: "650px",
              overflow: "hidden",
              background: "#ffffff",
            }}
          >
            <SandpackPreview
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              style={{
                width: "100%",
                height: "650px",
                border: "none",
                borderRadius: 0,
              }}
            />
          </div>
        </div>
      </div>
    </SandpackProvider>
  );
}

export default LivePreview;