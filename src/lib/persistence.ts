import { LabelSettings, LabelTemplate, ProductData } from './types';

export interface PersistedAppState {
  version: number;
  products: ProductData[];
  settings: LabelSettings | null;
  template: LabelTemplate | null;
  updatedAt: string | null;
  source?: 'server' | 'local';
}

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'offline' | 'error';

const LOCAL_STATE_KEY = 'label_printer_persistent_state_v1';

function isJsonResponse(response: Response): boolean {
  return (response.headers.get('content-type') || '').includes('application/json');
}

function normalizeState(state: any, source: PersistedAppState['source']): PersistedAppState | null {
  if (!state || typeof state !== 'object') return null;

  return {
    version: Number(state.version) || 1,
    products: Array.isArray(state.products) ? state.products : [],
    settings: state.settings && typeof state.settings === 'object' ? state.settings : null,
    template: state.template && typeof state.template === 'object' ? state.template : null,
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : null,
    source,
  };
}

function hasMeaningfulState(state: PersistedAppState | null): boolean {
  return Boolean(state && (state.products.length > 0 || state.settings || state.template));
}

function loadLocalState(): PersistedAppState | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_STATE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw), 'local');
  } catch {
    return null;
  }
}

function saveLocalState(state: Pick<PersistedAppState, 'products' | 'settings' | 'template'>): boolean {
  try {
    window.localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify({
      version: 1,
      products: state.products,
      settings: state.settings,
      template: state.template,
      updatedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

export function saveLocalSnapshot(state: Pick<PersistedAppState, 'products' | 'settings' | 'template'>): boolean {
  return saveLocalState(state);
}

export async function loadPersistentState(): Promise<PersistedAppState | null> {
  const localState = loadLocalState();

  try {
    const response = await fetch('/api/state', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok || !isJsonResponse(response)) return localState;

    const state = await response.json();
    const serverState = normalizeState(state, 'server');

    if (!hasMeaningfulState(serverState) && hasMeaningfulState(localState)) {
      return localState;
    }

    return serverState || localState;
  } catch {
    return localState;
  }
}

export async function savePersistentState(state: Pick<PersistedAppState, 'products' | 'settings' | 'template'>): Promise<SaveStatus> {
  const savedLocal = saveLocalState(state);

  try {
    const response = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        products: state.products,
        settings: state.settings,
        template: state.template,
      }),
    });
    return response.ok ? 'saved' : (savedLocal ? 'offline' : 'error');
  } catch {
    return savedLocal ? 'offline' : 'error';
  }
}
