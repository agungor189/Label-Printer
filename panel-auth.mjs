const SESSION_COOKIE = 'dsdst_label_session';
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function readCookie(req, name) {
  for (const pair of String(req.headers.cookie || '').split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(pair.slice(separator + 1).trim()); } catch { return undefined; }
  }
  return undefined;
}

function normalizeUser(value) {
  const permissions = value?.permissions && typeof value.permissions === 'object' ? value.permissions : {};
  return {
    id: String(value?.id || ''),
    username: String(value?.username || ''),
    role: String(value?.role || ''),
    permissions,
    must_change_password: value?.must_change_password === true,
  };
}

export function userHasLabelPermission(user, permission) {
  if (user?.role === 'admin') return true;
  if (user?.permissions?.['labels:admin'] === true) return true;
  if (user?.permissions?.[permission] === true) return true;
  return permission === 'labels:view' && user?.permissions?.['labels:edit'] === true;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    capabilities: {
      canView: userHasLabelPermission(user, 'labels:view'),
      canEdit: userHasLabelPermission(user, 'labels:edit'),
      canAdmin: userHasLabelPermission(user, 'labels:admin'),
    },
  };
}

export function createPanelAuth(options = {}) {
  const baseUrl = String(options.baseUrl ?? process.env.PANEL_API_URL ?? '').replace(/\/$/, '');
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: options.cookieSecure ?? (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production'),
    path: '/',
  };

  async function panelRequest(path, init = {}) {
    if (!baseUrl) return { ok: false, status: 503, body: { error: 'PANEL_AUTH_NOT_CONFIGURED' } };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, { ...init, redirect: 'error', signal: controller.signal });
      const raw = await response.text();
      let body;
      try { body = JSON.parse(raw); } catch { body = {}; }
      return { ok: response.ok, status: response.status, body };
    } catch {
      return { ok: false, status: 502, body: { error: 'PANEL_AUTH_UNAVAILABLE' } };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function meForToken(token) {
    const result = await panelRequest('/api/auth/me', {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    return { ...result, user: result.ok ? normalizeUser(result.body?.user) : null };
  }

  function requirePermission(permission) {
    return async (req, res, next) => {
      const token = readCookie(req, SESSION_COOKIE);
      if (!token) return res.status(401).json({ error: 'SESSION_REQUIRED' });
      const result = await meForToken(token);
      if (!result.ok || !result.user) {
        if (result.status >= 500) return res.status(502).json({ error: 'PANEL_AUTH_UNAVAILABLE' });
        res.clearCookie(SESSION_COOKIE, cookieOptions);
        return res.status(result.status === 403 ? 403 : 401).json({ error: 'SESSION_INVALID' });
      }
      if (result.user.must_change_password) return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED' });
      if (!userHasLabelPermission(result.user, permission)) return res.status(403).json({ error: 'FORBIDDEN', required: permission });
      res.locals.labelUser = result.user;
      next();
    };
  }

  return {
    cookieOptions,
    requirePermission,
    async login(req, res) {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim().slice(0, 254) : '';
      const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 1024) : '';
      if (!username || !password) return res.status(400).json({ error: 'VALIDATION_ERROR' });
      const login = await panelRequest('/api/auth/login', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!login.ok) return res.status(login.status).json({ error: login.status === 401 || login.status === 403 ? 'INVALID_CREDENTIALS' : 'PANEL_AUTH_UNAVAILABLE' });
      const token = typeof login.body?.token === 'string' ? login.body.token : '';
      if (!token) return res.status(502).json({ error: 'PANEL_AUTH_INVALID_RESPONSE' });
      const profile = await meForToken(token);
      if (!profile.ok || !profile.user) return res.status(502).json({ error: 'PANEL_AUTH_INVALID_RESPONSE' });
      if (profile.user.must_change_password) return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED' });
      if (!userHasLabelPermission(profile.user, 'labels:view')) return res.status(403).json({ error: 'FORBIDDEN', required: 'labels:view' });
      res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });
      return res.json({ user: publicUser(profile.user) });
    },
    async me(req, res) {
      const token = readCookie(req, SESSION_COOKIE);
      if (!token) return res.status(401).json({ error: 'SESSION_REQUIRED' });
      const result = await meForToken(token);
      if (!result.ok || !result.user) {
        if (result.status >= 500) return res.status(502).json({ error: 'PANEL_AUTH_UNAVAILABLE' });
        res.clearCookie(SESSION_COOKIE, cookieOptions);
        return res.status(401).json({ error: 'SESSION_INVALID' });
      }
      if (result.user.must_change_password) return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED' });
      if (!userHasLabelPermission(result.user, 'labels:view')) return res.status(403).json({ error: 'FORBIDDEN', required: 'labels:view' });
      return res.json({ user: publicUser(result.user) });
    },
    logout(_req, res) {
      res.clearCookie(SESSION_COOKIE, cookieOptions);
      return res.status(204).end();
    },
  };
}
