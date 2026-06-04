// ============================================================
//  SUPABASE CLIENT — CBI
// ============================================================
const SUPA_URL = 'https://tjzcgfjdhunqfifxgyyy.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqemNnZmpkaHVucWZpZnhneXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODUxMDUsImV4cCI6MjA5NTc2MTEwNX0.JJYKvSn_VOdWwhfe37diLBJ5ngF4NQvhwrnCwKokzRg';

// ── PEGA O TOKEN REAL DO USUÁRIO LOGADO ─────────────────────
function getAuthToken() {
  try {
    // Supabase v2 salva com essa chave exata
    const sbKey = 'sb-tjzcgfjdhunqfifxgyyy-auth-token';
    const raw = localStorage.getItem(sbKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.access_token || null;
    }
    // Fallback: procura qualquer chave sb- com auth-token
    for (let k of Object.keys(localStorage)) {
      if (k.startsWith('sb-') && k.includes('auth-token')) {
        const parsed = JSON.parse(localStorage.getItem(k));
        if (parsed && parsed.access_token) return parsed.access_token;
      }
    }
  } catch(e) {}
  return null;
}

function getSessionUser() {
  try {
    const sbKey = 'sb-tjzcgfjdhunqfifxgyyy-auth-token';
    const raw = localStorage.getItem(sbKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.user || null;
    }
    for (let k of Object.keys(localStorage)) {
      if (k.startsWith('sb-') && k.includes('auth-token')) {
        const parsed = JSON.parse(localStorage.getItem(k));
        if (parsed && parsed.user) return parsed.user;
      }
    }
  } catch(e) {}
  return null;
}

async function supaFetch(path, method = 'GET', body = null) {
  const token = getAuthToken() || SUPA_KEY;
  const opts = {
    method,
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(SUPA_URL + '/rest/v1/' + path, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

// ── PERFIL (banca inicial) ──────────────────────────────────
async function getPerfil(userId) {
  const rows = await supaFetch(`perfis?id=eq.${userId}&select=*`);
  return rows && rows.length > 0 ? rows[0] : null;
}

async function salvarPerfil(userId, email, saldoInicial) {
  const existe = await getPerfil(userId);
  if (existe) {
    await supaFetch(`perfis?id=eq.${userId}`, 'PATCH', { saldo_inicial: saldoInicial, updated_at: new Date().toISOString() });
  } else {
    await supaFetch('perfis', 'POST', { id: userId, email: email, saldo_inicial: saldoInicial, updated_at: new Date().toISOString() });
  }
}

// ── OPERAÇÕES ──────────────────────────────────────────────
async function getOperacoes(userId) {
  const rows = await supaFetch(`operacoes?user_id=eq.${userId}&order=created_at.asc&select=*`);
  return rows || [];
}

async function inserirOperacao(userId, dados) {
  await supaFetch('operacoes', 'POST', {
    user_id: userId,
    tipo: dados.tipo,
    valor: dados.valor,
    mercado: dados.mercado || null,
    resultado_principal: dados.resultado_principal || 0,
    resultado_opcionais: dados.resultado_opcionais || 0,
    descricao: dados.descricao || null,
    created_at: new Date().toISOString()
  });
}

async function deletarOperacoes(userId) {
  await supaFetch(`operacoes?user_id=eq.${userId}`, 'DELETE');
}

// ── SESSÃO ──────────────────────────────────────────────────
async function getSession() {
  // Primeiro tenta via localStorage (mais rápido e não precisa de request)
  const user = getSessionUser();
  if (user) return user;
  // Fallback: tenta via API com token real
  try {
    const token = getAuthToken();
    if (!token) return null;
    const res = await fetch(SUPA_URL + '/auth/v1/user', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// Namespace para ser acessível globalmente
window.CBI_DB = { getPerfil, salvarPerfil, getOperacoes, inserirOperacao, deletarOperacoes, getSession, supaFetch, getAuthToken, getSessionUser };
