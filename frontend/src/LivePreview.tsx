import { Sandpack } from "@codesandbox/sandpack-react";

interface LivePreviewProps {
  code: string;
}

function LivePreview({ code }: LivePreviewProps) {
  if (!code) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
        Generate code to see the live preview.
      </div>
    );
  }

  return (
    <div
      className="sandpack-preview-only"
      style={{
        width: "100%",
      }}
    >
      <Sandpack
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
          showNavigator: true,
          showTabs: false,
          editorHeight: "500px",
          externalResources: [
            "https://cdn.tailwindcss.com",
          ],
        }}
      />
    </div>
  );
}

export default LivePreview;