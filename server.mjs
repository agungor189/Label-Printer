import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWarehouseRendererApp } from './warehouse-renderer.mjs';
import { readTemplateState, writeTemplateState } from './template-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
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

app.use(express.json({ limit: '10mb' }));

function normalizeTemplate(template) {
  if (!template || typeof template !== 'object') return null;
  if (!Array.isArray(template.elements)) return null;
  return template;
}

async function readState() {
  try {
    return { ...emptyState, ...(await readTemplateState(stateFile)) };
  } catch (error) {
    console.warn(`State read failed, returning safe defaults: ${error.message}`);
    return { ...emptyState, ...(await readTemplateState(`${stateFile}.missing`)) };
  }
}

async function writeState(nextState) {
  return writeTemplateState(stateFile, {
    version: 2,
    products: Array.isArray(nextState.products) ? nextState.products : [],
    settings: nextState.settings && typeof nextState.settings === 'object' ? nextState.settings : null,
    template: normalizeTemplate(nextState.template),
    locationTemplate: normalizeTemplate(nextState.locationTemplate),
    templates: Array.isArray(nextState.templates) ? nextState.templates : undefined,
    updatedAt: new Date().toISOString(),
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, stateFile });
});

app.get('/api/state', async (_req, res, next) => {
  try {
    res.json(await readState());
  } catch (error) {
    next(error);
  }
});

app.put('/api/state', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Invalid state payload.' });
      return;
    }
    res.json(await writeState(req.body));
  } catch (error) {
    next(error);
  }
});

// The same process can serve both the editor and the headless API. The
// dedicated Docker renderer mounts the same state file and exposes identical
// endpoints, so Warehouse always reads the latest saved design.
app.use(createWarehouseRendererApp({
  apiKey: process.env.LABEL_API_KEY || process.env.LABEL_RENDERER_API_KEY || '',
  stateFile,
}));

app.use(express.static(distDir));

app.get('*', async (_req, res) => {
  try {
    await fs.access(path.join(distDir, 'index.html'));
    res.sendFile(path.join(distDir, 'index.html'));
  } catch {
    res.status(404).send('Build bulunamadi. Once `npm run build`, sonra `npm start` calistirin.');
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Label Printer server listening on http://0.0.0.0:${port}`);
  console.log(`Persistent state file: ${stateFile}`);
});
