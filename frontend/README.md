# React + TypeScript + Vite

## PixelForge generation checks

Run `npm test` with Node.js 22.18+ or 24+ to test request cancellation, stale
responses, duplicate starts, timeouts, malformed responses, and preservation of
existing edits. Tests use the built-in Node runner and mock fetch; they do not
call the backend or Gemini. Run `npm run lint` and `npm run build` for static checks.

For a manual check, start the frontend and backend, upload a screenshot, and
generate code. Edit the result, then try regenerating with the browser set offline:
your edits should remain. While a generation is pending, use Cancel generation
or Escape, or select another screenshot: the old result must not appear afterward.
Escape inside the code editor is left to the editor. Closing the replacement
file picker without selecting a file keeps the current screenshot and code.

The browser deadline is 90 seconds. Server generation defaults to 60 seconds,
leaving room for upload and response transfer. Cancelling aborts the browser
request, but cannot guarantee that provider-side processing or billing stops.

## Generated-code validation and preview recovery

Before replacing an existing result, the browser parses generated JavaScript/JSX
and checks the single-file contract: a default-exported component, static imports
only from `react` and `lucide-react`, no dynamic imports or `require()`, and a
200,000-character size limit. Invalid generations leave the existing result intact.
This is a compatibility check, not a security sandbox, type checker, or guarantee
of visual accuracy. The preview's compiler and runtime still detect errors such
as missing icon exports and undefined variables. No automatic AI repair is run.

The editor remains mounted even when its entire contents are deleted. Preview
errors keep the editor and copy/download actions available. Use **Restart
preview** after fixing code or reconnecting. **Restore generated code** replaces
edits with the latest accepted generation for the current screenshot. It is an
in-memory recovery point, not persistent project history.

Manual recovery checks after a successful generation:

1. Delete a closing JSX tag. An error should appear while the editor stays usable.
2. Fix the tag. The preview should recover; use Restart preview if necessary.
3. Introduce a render-time error, e.g. `throw new Error("Preview check")` inside
   the component. The preview should show an error without taking down the app.
4. Click Restore generated code. The original generated component should return
   and copy/download should use that restored code.
5. Delete all code. The editor and Restore generated code must remain available.

The editor/preview and JSX parser load on demand to keep the initial page smaller.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
