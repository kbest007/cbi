// ============================================================
//  SISTEMA DE LICENÇA — Controle de Banca Inteligente
//  Arquivo: licenca.js
//  Inclua este script em TODAS as páginas protegidas.
// ============================================================

// E-mail do administrador master (único que pode liberar licenças)
const ADMIN_EMAIL = 'cbest07@gmail.com';

// Configurações da licença
const LICENCA_DIAS = 7;

// Supabase config (mesma do projeto)
const SUPABASE_URL = 'https://tjzcgfjdhunqfifxgyyy.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqemNnZmpkaHVucWZpZnhneXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODUxMDUsImV4cCI6MjA5NTc2MTEwNX0.JJYKvSn_VOdWwhfe37diLBJ5ngF4NQvhwrnCwKokzRg';

// ----------------------------------------------------------------
// Helpers de data
// ----------------------------------------------------------------
function diasRestantes(dataExpiracao) {
  const agora = new Date();
  const exp = new Date(dataExpiracao);
  const diff = exp - agora;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function dataExpiracaoPara(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

// ----------------------------------------------------------------
// Storage de licenças — usa localStorage com chave por e-mail
// ----------------------------------------------------------------
const LS_KEY = 'cbi_licencas';

function lerLicencas() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}

function salvarLicencas(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function verificarLicenca(email) {
  const licencas = lerLicencas();
  const lic = licencas[email];
  if (!lic) return { ativa: false, motivo: 'Sem licença cadastrada.' };
  const restam = diasRestantes(lic.expiracao);
  if (restam <= 0) return { ativa: false, motivo: 'Licença expirada.' };
  return { ativa: true, restam, expiracao: lic.expiracao };
}

function liberarLicenca(emailAlvo) {
  const licencas = lerLicencas();
  licencas[emailAlvo] = {
    email: emailAlvo,
    liberadoEm: new Date().toISOString(),
    expiracao: dataExpiracaoPara(LICENCA_DIAS)
  };
  salvarLicencas(licencas);
}

function revogarLicenca(emailAlvo) {
  const licencas = lerLicencas();
  delete licencas[emailAlvo];
  salvarLicencas(licencas);
}

function listarTodasLicencas() {
  return lerLicencas();
}

// ----------------------------------------------------------------
// Proteção de página — chame em páginas protegidas
// ----------------------------------------------------------------
async function protegerPagina() {
  // Obtém sessão do Supabase
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + obterToken() }
  }).catch(() => null);

  const emailSessao = localStorage.getItem('cbi_email_sessao');

  if (!emailSessao) {
    window.location.href = 'login.html';
    return null;
  }

  // Admin sempre tem acesso
  if (emailSessao === ADMIN_EMAIL) {
    return { email: emailSessao, isAdmin: true };
  }

  // Verifica licença do usuário
  const lic = verificarLicenca(emailSessao);
  if (!lic.ativa) {
    mostrarTelaAcessoBloqueado(emailSessao, lic.motivo);
    return null;
  }

  return { email: emailSessao, isAdmin: false, licenca: lic };
}

function obterToken() {
  // Tenta recuperar o token de sessão do Supabase salvo
  try {
    const chaves = Object.keys(localStorage);
    for (const k of chaves) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const parsed = JSON.parse(localStorage.getItem(k));
        return parsed?.access_token || '';
      }
    }
  } catch { }
  return '';
}

// ----------------------------------------------------------------
// Tela de acesso bloqueado (injetada no body)
// ----------------------------------------------------------------
function mostrarTelaAcessoBloqueado(email, motivo) {
  document.body.innerHTML = `
    <style>
      * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter',sans-serif; }
      body { background:#020617; min-height:100vh; display:flex; align-items:center; justify-content:center; }
      .glow { position:fixed; width:600px; height:600px; background:#dc2626; opacity:.08; filter:blur(160px); border-radius:50%; left:50%; top:50%; transform:translate(-50%,-50%); }
      .card { background:rgba(15,23,42,.9); border:1px solid rgba(220,38,38,.2); border-radius:28px; padding:40px; max-width:420px; width:100%; text-align:center; position:relative; z-index:2; }
      .icon { font-size:52px; margin-bottom:20px; }
      h2 { color:white; font-size:24px; font-weight:800; margin-bottom:10px; }
      p { color:#94a3b8; font-size:14px; line-height:1.6; margin-bottom:6px; }
      .email { color:#ef4444; font-weight:600; font-size:13px; background:rgba(220,38,38,.1); padding:8px 16px; border-radius:10px; display:inline-block; margin:12px 0; }
      .motivo { color:#fca5a5; font-size:13px; margin-bottom:24px; }
      .btn { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:white; border:none; border-radius:14px; font-size:14px; font-weight:700; cursor:pointer; text-decoration:none; }
      .hint { margin-top:20px; color:#475569; font-size:12px; }
    </style>
    <div class="glow"></div>
    <div class="card">
      <div class="icon">🔒</div>
      <h2>Acesso Restrito</h2>
      <p>A licença desta conta não está ativa.</p>
      <div class="email">${email}</div>
      <p class="motivo">${motivo}</p>
      <p style="color:#64748b;font-size:13px;margin-bottom:24px;">Entre em contato com o administrador do sistema para solicitar a liberação do seu acesso.</p>
      <button class="btn" onclick="localStorage.removeItem('cbi_email_sessao'); window.location.href='login.html'">Voltar ao Login</button>
      <p class="hint">CBI — Controle de Banca Inteligente</p>
    </div>
  `;
}

// ----------------------------------------------------------------
// Painel de Administração de Licenças (renderiza num container)
// ----------------------------------------------------------------
function renderizarPainelAdmin(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  function refresh() {
    const licencas = listarTodasLicencas();
    const linhas = Object.values(licencas).map(lic => {
      const restam = diasRestantes(lic.expiracao);
      const statusCor = restam > 0 ? '#00e5a0' : '#ff4d6d';
      const statusTxt = restam > 0 ? `${restam} dia(s) restante(s)` : 'Expirada';
      const dataExp = new Date(lic.expiracao).toLocaleDateString('pt-BR');
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);flex-wrap:wrap;gap:8px;">
          <div>
            <div style="color:white;font-size:13px;font-weight:600;">${lic.email}</div>
            <div style="color:#64748b;font-size:12px;margin-top:2px;">Expira em: ${dataExp}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="color:${statusCor};font-size:12px;font-weight:700;">${statusTxt}</span>
            <button onclick="renovarLicencaAdmin('${lic.email}')" style="padding:6px 12px;background:rgba(79,70,229,.2);border:1px solid rgba(79,70,229,.4);color:#818cf8;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;">Renovar</button>
            <button onclick="revogarLicencaAdmin('${lic.email}')" style="padding:6px 12px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);color:#ef4444;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;">Revogar</button>
          </div>
        </div>
      `;
    }).join('');

    const semLicencas = Object.keys(licencas).length === 0
      ? `<p style="color:#64748b;font-size:13px;padding:16px 0;">Nenhuma licença cadastrada ainda.</p>`
      : '';

    container.innerHTML = `
      <div style="background:#071226;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:24px;margin-bottom:20px;">
        <h3 style="font-size:17px;font-weight:800;color:white;margin-bottom:6px;">🔑 Liberar Nova Licença</h3>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:18px;">Digite o login (e-mail) do usuário para liberar ${LICENCA_DIAS} dias de acesso.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <input id="adminEmailInput" type="email" placeholder="email@usuario.com"
            style="flex:1;min-width:200px;padding:13px 16px;background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:white;font-size:14px;"
            onkeydown="if(event.key==='Enter') liberarLicencaAdmin()">
          <button onclick="liberarLicencaAdmin()"
            style="padding:13px 22px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;border-radius:12px;color:white;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;">
            ✓ Liberar Acesso
          </button>
        </div>
        <div id="adminMsg" style="margin-top:12px;font-size:13px;display:none;"></div>
      </div>

      <div style="background:#071226;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:24px;">
        <h3 style="font-size:17px;font-weight:800;color:white;margin-bottom:4px;">📋 Licenças Ativas</h3>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:18px;">Todas as licenças cadastradas no sistema.</p>
        ${semLicencas}
        ${linhas}
      </div>
    `;
  }

  window.liberarLicencaAdmin = function() {
    const input = document.getElementById('adminEmailInput');
    const msg = document.getElementById('adminMsg');
    const email = (input.value || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      msg.style.display = 'block';
      msg.style.color = '#fca5a5';
      msg.textContent = '⚠ Digite um e-mail válido.';
      return;
    }

    liberarLicenca(email);
    input.value = '';
    msg.style.display = 'block';
    msg.style.color = '#86efac';
    msg.textContent = `✓ Licença de ${LICENCA_DIAS} dias liberada para ${email}`;
    setTimeout(() => { msg.style.display = 'none'; }, 4000);
    refresh();
  };

  window.renovarLicencaAdmin = function(email) {
    liberarLicenca(email);
    refresh();
  };

  window.revogarLicencaAdmin = function(email) {
    if (confirm(`Revogar acesso de ${email}?`)) {
      revogarLicenca(email);
      refresh();
    }
  };

  refresh();
}

// Exporta para uso global
window.CBI_LICENCA = {
  ADMIN_EMAIL,
  verificarLicenca,
  liberarLicenca,
  revogarLicenca,
  protegerPagina,
  renderizarPainelAdmin,
  diasRestantes
};
