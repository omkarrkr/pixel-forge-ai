import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GenerationRequest } from '../src/generation.ts';

const file = new File(['image'], 'screen.png', { type: 'image/png' });
const response = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function setup(t, fetcher, timeout = 1000) {
  t.mock.method(globalThis, 'fetch', fetcher);
  const state = { code: 'existing edited code', error: '', busy: false };
  const request = new GenerationRequest({
    onBusy: busy => { state.busy = busy; },
    onError: error => { state.error = error; },
    onCode: code => { state.code = code; },
  }, timeout);
  t.after(() => request.cancel(false));
  return { request, state };
}

test('successful generation replaces code and finishes', async t => {
  const { request, state } = setup(t, async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.body.get('file').name, 'screen.png');
    return response({ code: 'new code' });
  });
  await request.generate(file, '/generate');
  assert.deepEqual(state, { code: 'new code', busy: false, error: '' });
});

test('failure preserves edits and exposes rate-limit recovery', async t => {
  const { request, state } = setup(t, async () => response({ error: 'Too many requests.' }, 429, { 'Retry-After': '12' }));
  await request.generate(file, '/generate');
  assert.equal(state.code, 'existing edited code');
  assert.match(state.error, /12 seconds/);
  assert.equal(state.busy, false);
});

test('cancel ignores a late response even when fetch ignores abort', async t => {
  const pending = deferred();
  let signal;
  const { request, state } = setup(t, (_url, options) => { signal = options.signal; return pending.promise; });
  const work = request.generate(file, '/generate');
  request.cancel();
  assert.equal(signal.aborted, true);
  assert.equal(state.busy, false);
  pending.resolve(response({ code: 'obsolete code' }));
  await work;
  assert.equal(state.code, 'existing edited code');
  assert.equal(state.error, '');
});

test('old result and finally cannot overwrite a newer active request', async t => {
  const old = deferred();
  const fresh = deferred();
  let calls = 0;
  const { request, state } = setup(t, () => (++calls === 1 ? old.promise : fresh.promise));
  const first = request.generate(file, '/generate');
  request.cancel(); // same invalidation used when a different screenshot is selected
  const second = request.generate(file, '/generate');
  old.resolve(response({ code: 'obsolete code' }));
  await first;
  assert.equal(state.busy, true);
  assert.equal(state.code, 'existing edited code');
  fresh.resolve(response({ code: 'fresh code' }));
  await second;
  assert.equal(state.code, 'fresh code');
  assert.equal(state.busy, false);
});

test('old failure cannot replace the new request status', async t => {
  const old = deferred();
  const fresh = deferred();
  let calls = 0;
  const { request, state } = setup(t, () => (++calls === 1 ? old.promise : fresh.promise));
  const first = request.generate(file, '/generate');
  request.cancel();
  const second = request.generate(file, '/generate');
  old.reject(new TypeError('network'));
  await first;
  assert.equal(state.error, '');
  assert.equal(state.busy, true);
  fresh.resolve(response({ code: 'fresh' }));
  await second;
});

test('duplicate starts make only one request', async t => {
  const pending = deferred();
  let calls = 0;
  const { request } = setup(t, () => { calls++; return pending.promise; });
  const first = request.generate(file, '/generate');
  await request.generate(file, '/generate');
  assert.equal(calls, 1);
  pending.resolve(response({ code: 'code' }));
  await first;
});

test('timeout aborts, preserves edits, and ignores a late success', async t => {
  const pending = deferred();
  let signal;
  const { request, state } = setup(t, (_url, options) => { signal = options.signal; return pending.promise; }, 10);
  const work = request.generate(file, '/generate');
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(signal.aborted, true);
  assert.equal(state.busy, false);
  assert.match(state.error, /timed out/);
  pending.resolve(response({ code: 'late code' }));
  await work;
  assert.equal(state.code, 'existing edited code');
  assert.match(state.error, /timed out/);
});

test('empty and malformed responses preserve existing code', async t => {
  const samples = [{ code: '' }, { code: 123 }, {}, null];
  const { request, state } = setup(t, async () => response(samples.shift()));
  for (let i = 0; i < 4; i++) {
    await request.generate(file, '/generate');
    assert.equal(state.code, 'existing edited code');
    assert.match(state.error, /No code/);
  }
});

test('HTML gateway errors produce readable feedback', async t => {
  const { request, state } = setup(t, async () => new Response('<html>bad gateway</html>', { status: 502 }));
  await request.generate(file, '/generate');
  assert.match(state.error, /unreadable response/);
  assert.equal(state.code, 'existing edited code');
});

test('network failures allow another attempt', async t => {
  let calls = 0;
  const { request, state } = setup(t, async () => {
    if (++calls === 1) throw new TypeError('Failed to fetch');
    return response({ code: 'recovered' });
  });
  await request.generate(file, '/generate');
  assert.match(state.error, /connection/);
  await request.generate(file, '/generate');
  assert.equal(state.code, 'recovered');
  assert.equal(state.error, '');
});
