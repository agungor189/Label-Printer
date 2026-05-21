import { LabelSettings, LabelTemplate, ProductData } from './types';

export interface PersistedAppState {
  version: number;
  products: ProductData[];
  settings: LabelSettings | null;
  template: LabelTemplate | null;
  updatedAt: string | null;
}

export type SaveStatus = 'loading' | 'saving' | 'saved' | 'offline' | 'error';

function isJsonResponse(response: Response): boolean {
  return (response.headers.get('content-type') || '').includes('application/json');
}

export async function loadPersistentState(): Promise<PersistedAppState | null> {
  try {
    const response = await fetch('/api/state', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok || !isJsonResponse(response)) return null;

    const state = await response.json();
    if (!state || typeof state !== 'object') return null;

    return {
      version: Number(state.version) || 1,
      products: Array.isArray(state.products) ? state.products : [],
      settings: state.settings && typeof state.settings === 'object' ? state.settings : null,
      template: state.template && typeof state.template === 'object' ? state.template : null,
      updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : null,
    };
  } catch {
    return null;
  }
}

export async function savePersistentState(state: Pick<PersistedAppState, 'products' | 'settings' | 'template'>): Promise<boolean> {
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
    return response.ok;
  } catch {
    return false;
  }
}
