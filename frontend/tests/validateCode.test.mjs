import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGeneratedCode } from '../src/validateCode.ts';

test('accepts supported React component forms', () => {
  for (const code of [
    'export default function App() { return <div>Hello</div>; }',
    'import React from "react"; const App = () => <div/>; export default App;',
    'import {Camera} from "lucide-react"; export default () => <Camera/>;',
    'const App = () => <div/>; export {App as default};',
    'import React from "react"; export default () => React.createElement("div");',
    'import React from "react"; export default class App extends React.Component { render() { return <div/>; } }',
  ]) assert.equal(validateGeneratedCode(code), null, code);
});

test('reports JSX syntax errors with location', () => {
  assert.match(validateGeneratedCode('export default function App() { return <div>; }'), /Invalid React JSX:.*\(1:/);
});

test('requires a default export', () => {
  assert.match(validateGeneratedCode('export function App() { return <div/>; }'), /as default/);
});

test('rejects obvious non-component default exports', () => {
  for (const code of ['export default 42;', 'export default {};', 'export default <div/>;']) {
    assert.match(validateGeneratedCode(code), /must be a React component/);
  }
});

test('rejects external and local dependencies that are absent from preview', () => {
  for (const source of ['./Button', './styles.css', 'next/image', 'axios', 'https://example.com/app.js']) {
    assert.match(validateGeneratedCode(`import X from '${source}'; export default () => <X/>;`), /Unsupported import/);
  }
});

test('rejects dynamic imports and require inside functions', () => {
  for (const expression of ['import("react")', 'require("react")', 'import(name)']) {
    assert.match(validateGeneratedCode(`export default function App() { const x = ${expression}; return <div/>; }`), /Dynamic imports/);
  }
});

test('does not mistake strings and comments for imports', () => {
  assert.equal(validateGeneratedCode(`// require('bad')\nexport default () => <div>{'import("bad")'}</div>;`), null);
});

test('rejects re-exports from missing files', () => {
  assert.match(validateGeneratedCode('export {default} from "./App";'), /Unsupported import/);
});

test('rejects empty output, TypeScript, Markdown fences and oversized output', () => {
  assert.match(validateGeneratedCode(''), /empty/);
  assert.match(validateGeneratedCode('export default function App(): JSX.Element { return <div/>; }'), /Invalid React JSX/);
  assert.match(validateGeneratedCode('```jsx\nexport default () => <div/>;\n```'), /Markdown/);
  assert.match(validateGeneratedCode(' '.repeat(200001) + 'export default () => <div/>;'), /too large/);
});
