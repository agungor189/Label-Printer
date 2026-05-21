import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.resolve(__dirname, process.env.DATA_DIR || 'data');
const stateFile = path.resolve(dataDir, process.env.STATE_FILE || 'app-state.json');
const distDir = path.resolve(__dirname, 'dist');

const emptyState = {
  version: 1,
  products: [],
  settings: null,
  template: null,
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
    const raw = await fs.readFile(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...emptyState,
      ...parsed,
      products: Array.isArray(parsed.products) ? parsed.products : [],
      template: normalizeTemplate(parsed.template),
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`State read failed, returning empty state: ${error.message}`);
    }
    return emptyState;
  }
}

async function writeState(nextState) {
  await fs.mkdir(dataDir, { recursive: true });
  const state = {
    version: 1,
    products: Array.isArray(nextState.products) ? nextState.products : [],
    settings: nextState.settings && typeof nextState.settings === 'object' ? nextState.settings : null,
    template: normalizeTemplate(nextState.template),
    updatedAt: new Date().toISOString(),
  };
  const tmpFile = `${stateFile}.tmp`;
  await fs.writeFile(tmpFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await fs.rename(tmpFile, stateFile);
  return state;
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
