import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTemplateState, writeTemplateState } from './template-store.mjs';
import { createLoginRateLimit } from './login-rate-limit.mjs';
import { createPanelAuth } from './panel-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const dataDir = path.resolve(__dirname, process.env.DATA_DIR || 'data');
const stateFile = path.resolve(dataDir, process.env.STATE_FILE || 'app-state.json');
const distDir = path.resolve(__dirname, 'dist');

const emptyState = {
  version: 2,
  products: [],
  settings: null,
  template: null,
  locationTemplate: null,
  templates: [],
  updatedAt: null,
};

function normalizeTemplate(template) {
  if (!template || typeof template !== 'object') return null;
  if (!Array.isArray(template.elements)) return null;
  return template;
}

async function readState(targetStateFile = stateFile) {
  try {
    return { ...emptyState, ...(await readTemplateState(targetStateFile)) };
  } catch (error) {
    console.warn(`State read failed, returning safe defaults: ${error.message}`);
    return { ...emptyState, ...(await readTemplateState(`${targetStateFile}.missing`)) };
  }
}

async function writeState(nextState, targetStateFile = stateFile) {
  return writeTemplateState(targetStateFile, {
    version: 2,
    products: Array.isArray(nextState.products) ? nextState.products : [],
    settings: nextState.settings && typeof nextState.settings === 'object' ? nextState.settings : null,
    template: normalizeTemplate(nextState.template),
    locationTemplate: normalizeTemplate(nextState.locationTemplate),
    templates: Array.isArray(nextState.templates) ? nextState.templates : undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function createLabelPrinterApp(options = {}) {
const app = express();
const appStateFile = path.resolve(options.stateFile || stateFile);
const appDistDir = path.resolve(options.distDir || distDir);
const trustProxyHops = Number(options.trustProxyHops ?? process.env.TRUST_PROXY_HOPS ?? 0);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) app.set('trust proxy', trustProxyHops);
const panelAuth = createPanelAuth({
  baseUrl: options.panelApiUrl,
  fetchImpl: options.fetchImpl,
  cookieSecure: options.cookieSecure,
  timeoutMs: options.timeoutMs,
});
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, stateFile: appStateFile });
});
app.post('/api/auth/login', createLoginRateLimit(options.loginRateLimit), panelAuth.login);
app.get('/api/auth/me', panelAuth.me);
app.post('/api/auth/logout', panelAuth.logout);

app.get('/api/state', panelAuth.requirePermission('labels:view'), async (_req, res, next) => {
  try {
    res.json(await readState(appStateFile));
  } catch (error) {
    next(error);
  }
});

app.put('/api/state', panelAuth.requirePermission('labels:edit'), async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Invalid state payload.' });
      return;
    }
    res.json(await writeState(req.body, appStateFile));
  } catch (error) {
    next(error);
  }
});

app.use(express.static(appDistDir));

app.get('*', async (_req, res) => {
  try {
    await fs.access(path.join(appDistDir, 'index.html'));
    res.sendFile(path.join(appDistDir, 'index.html'));
  } catch {
    res.status(404).send('Build bulunamadi. Once `npm run build`, sonra `npm start` calistirin.');
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error.' });
});

return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) createLabelPrinterApp().listen(port, '0.0.0.0', () => {
  console.log(`Label Printer server listening on http://0.0.0.0:${port}`);
  console.log(`Persistent state file: ${stateFile}`);
});
