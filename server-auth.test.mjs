import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import { createLabelPrinterApp } from './server.mjs';

const listen = async (app) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

const close = async (server) => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
};

test('Panel JWT HttpOnly cookie içinde kalır ve state izinleri view/edit olarak ayrılır', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-auth-'));
  const panel = express();
  panel.use(express.json());
  panel.post('/api/auth/login', (req, res) => res.json({ token: `token-${req.body.username}`, user: { username: req.body.username } }));
  panel.get('/api/auth/me', (req, res) => {
    const token = String(req.headers.authorization || '').replace('Bearer token-', '');
    const permissions = token === 'viewer' ? { 'labels:view': true }
      : token === 'editor' ? { 'labels:edit': true }
        : {};
    res.json({ success: true, user: { id: token, username: token, role: token === 'admin' ? 'admin' : 'user', permissions, must_change_password: false } });
  });
  const panelServer = await listen(panel);
  const labelServer = await listen(createLabelPrinterApp({
    panelApiUrl: panelServer.baseUrl,
    cookieSecure: false,
    stateFile: path.join(directory, 'state.json'),
    distDir: directory,
  }));

  const login = async (username) => {
    const response = await fetch(`${labelServer.baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password: 'correct' }),
    });
    return { response, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
  };

  try {
    assert.equal((await fetch(`${labelServer.baseUrl}/api/state`)).status, 401);

    const viewer = await login('viewer');
    assert.equal(viewer.response.status, 200);
    assert.match(viewer.response.headers.get('set-cookie') || '', /HttpOnly/i);
    assert.match(viewer.response.headers.get('set-cookie') || '', /SameSite=Strict/i);
    assert.doesNotMatch(await viewer.response.text(), /token-viewer/);
    assert.equal((await fetch(`${labelServer.baseUrl}/api/state`, { headers: { cookie: viewer.cookie } })).status, 200);
    assert.equal((await fetch(`${labelServer.baseUrl}/api/state`, { method: 'PUT', headers: { cookie: viewer.cookie, 'content-type': 'application/json' }, body: '{}' })).status, 403);

    const editor = await login('editor');
    assert.equal(editor.response.status, 200);
    const saved = await fetch(`${labelServer.baseUrl}/api/state`, {
      method: 'PUT', headers: { cookie: editor.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ products: [{ sku: 'KEEP' }] }),
    });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).products[0].sku, 'KEEP');

    const outsider = await login('outsider');
    assert.equal(outsider.response.status, 403);
    assert.equal(outsider.response.headers.get('set-cookie'), null);
  } finally {
    await close(labelServer.server);
    await close(panelServer.server);
    await rm(directory, { recursive: true, force: true });
  }
});
