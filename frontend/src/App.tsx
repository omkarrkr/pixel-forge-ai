import { useState } from "react";

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    setSelectedImage(imageUrl);
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">

      <div className="w-full max-w-3xl text-center">

        {/* Heading */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold tracking-tight">
            PixelForge AI
          </h1>

          <p className="mt-4 text-lg text-slate-400">
            Turn screenshots into beautiful frontend code
          </p>
        </div>

        {/* Upload Area */}
        {!selectedImage ? (
          <label
            htmlFor="image-upload"
            className="block cursor-pointer"
          >
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-16 hover:border-slate-500 hover:bg-slate-900 transition">

              <div className="text-5xl mb-5">
                📸
              </div>

              <h2 className="text-xl font-semibold">
                Upload your screenshot
              </h2>

              <p className="mt-2 text-slate-400">
                Click here to choose an image
              </p>

              <p className="mt-3 text-sm text-slate-500">
                PNG, JPG or WEBP
              </p>

            </div>
          </label>
        ) : (
          /* Image Preview */
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <img
              src={selectedImage}
              alt="Selected screenshot"
              className="w-full max-h-[500px] object-contain rounded-xl"
            />

            <button
              onClick={removeImage}
              className="mt-5 px-5 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
            >
              Remove Screenshot
            </button>

          </div>
        )}

        {/* Hidden file input */}
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Generate button */}
        {selectedImage && (
          <button
            className="mt-8 px-8 py-3 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition"
          >
            ✨ Generate Code
          </button>
        )}

      </div>

    </div>
  );
}

export default App;