import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import express from 'express';
import { createLabelPrinterApp } from '../server.mjs';

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

test('KNOWN BUSINESS RED: a stale template writer receives an exact CAS conflict', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'label-cas-red-'));
  const panel = express();
  panel.use(express.json());
  panel.post('/api/auth/login', (_req, res) => res.json({ token: 'editor-token', user: { username: 'editor' } }));
  panel.get('/api/auth/me', (_req, res) => res.json({
    success: true,
    user: { id: 'editor', username: 'editor', role: 'user', permissions: { 'labels:edit': true }, must_change_password: false },
  }));
  const panelServer = await listen(panel);
  const labelServer = await listen(createLabelPrinterApp({
    panelApiUrl: panelServer.baseUrl,
    cookieSecure: false,
    stateFile: path.join(directory, 'state.json'),
    distDir: directory,
  }));
  try {
    const login = await fetch(`${labelServer.baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'editor', password: 'correct' }),
    });
    const cookie = login.headers.get('set-cookie')?.split(';')[0] || '';
    const base = await (await fetch(`${labelServer.baseUrl}/api/state`, { headers: { cookie } })).json();
    const makeTemplate = (id) => ({ id, name: id, purpose: 'custom', isDefault: true, width: 100, height: 60, elements: [] });
    const first = await fetch(`${labelServer.baseUrl}/api/state`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json', 'if-match': '0' },
      body: JSON.stringify({ ...base, revision: 0, templates: [makeTemplate('writer-a')] }),
    });
    assert.equal(first.status, 200);
    const stale = await fetch(`${labelServer.baseUrl}/api/state`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json', 'if-match': '0' },
      body: JSON.stringify({ ...base, revision: 0, templates: [makeTemplate('writer-b')] }),
    });
    assert.equal(stale.status, 409, 'the second writer using revision 0 must not be acknowledged');
    const finalState = await (await fetch(`${labelServer.baseUrl}/api/state`, { headers: { cookie } })).json();
    assert.deepEqual(finalState.templates.map(({ id }) => id), ['writer-a']);
  } finally {
    await close(labelServer.server);
    await close(panelServer.server);
    await rm(directory, { recursive: true, force: true });
  }
});
