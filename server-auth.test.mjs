import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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
  const activeTokens = new Set();
  panel.use(express.json());
  panel.use('/api/auth/service', (req, res, next) => req.header('x-api-key') === 'label-service-secret' ? next() : res.status(401).json({ error: 'SERVICE_UNAUTHORIZED' }));
  panel.post('/api/auth/service/login', (req, res) => {
    activeTokens.add(`token-${req.body.username}`);
    res.json({ token: `token-${req.body.username}`, user: { username: req.body.username } });
  });
  panel.get('/api/auth/service/me', (req, res) => {
    if (!activeTokens.has(String(req.headers.authorization || '').replace('Bearer ', ''))) return res.status(401).json({ error: 'SESSION_INVALID' });
    const token = String(req.headers.authorization || '').replace('Bearer token-', '');
    const permissions = token === 'viewer' ? { 'labels:view': true }
      : token === 'editor' ? { 'labels:edit': true }
        : {};
    res.json({ success: true, user: { id: token, username: token, role: token === 'admin' ? 'admin' : 'user', permissions, must_change_password: false } });
  });
  panel.post('/api/auth/service/logout', (req, res) => {
    activeTokens.delete(String(req.headers.authorization || '').replace('Bearer ', ''));
    res.json({ success: true });
  });
  const panelServer = await listen(panel);
  const labelStateFile = path.join(directory, 'state.json');
  const labelServer = await listen(createLabelPrinterApp({
    panelApiUrl: panelServer.baseUrl,
    panelApiKey: 'label-service-secret',
    cookieSecure: false,
    stateFile: labelStateFile,
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
      method: 'PUT', headers: { cookie: editor.cookie, 'content-type': 'application/json', 'if-match': '0' }, body: JSON.stringify({ revision: 0, products: [{ sku: 'KEEP' }] }),
    });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).products[0].sku, 'KEEP');

    const loggedOut = await fetch(`${labelServer.baseUrl}/api/auth/logout`, { method: 'POST', headers: { cookie: editor.cookie } });
    assert.equal(loggedOut.status, 204);
    assert.match(loggedOut.headers.get('set-cookie') || '', /dsdst_label_session=;/);
    assert.equal((await fetch(`${labelServer.baseUrl}/api/state`, { headers: { cookie: editor.cookie } })).status, 401);

    const editorAgain = await login('editor');

    await writeFile(labelStateFile, JSON.stringify({ version: 999, products: [{ sku: 'MUST-NOT-DROP' }] }), 'utf8');
    const corruptState = await fetch(`${labelServer.baseUrl}/api/state`, { headers: { cookie: editorAgain.cookie } });
    assert.equal(corruptState.status, 409);
    assert.match((await corruptState.json()).error, /Unsupported label state version: 999/);

    const outsider = await login('outsider');
    assert.equal(outsider.response.status, 403);
    assert.equal(outsider.response.headers.get('set-cookie'), null);
  } finally {
    await close(labelServer.server);
    await close(panelServer.server);
    await rm(directory, { recursive: true, force: true });
  }
});
