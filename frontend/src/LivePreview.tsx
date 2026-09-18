import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";

interface LivePreviewProps {
  code: string;
}

function LivePreview({ code }: LivePreviewProps) {
  if (!code) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-slate-950 text-sm text-slate-500">
        Generate code to see the live preview.
      </div>
    );
  }

  return (
    <SandpackProvider
      template="react"
      files={{
        "/App.js": {
          code,
        },
      }}
      customSetup={{
        dependencies: {
          "lucide-react": "latest",
        },
      }}
      options={{
        externalResources: [
          "https://cdn.tailwindcss.com",
        ],
      }}
    >
      <SandpackLayout
        style={{
          border: "none",
          borderRadius: 0,
          overflow: "hidden",
        }}
      >
        <SandpackPreview
          showNavigator={true}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
          showRestartButton={false}
          style={{
            height: "600px",
            border: "none",
          }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

export default LivePreview;