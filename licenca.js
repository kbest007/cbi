// ============================================================
//  SISTEMA DE LICENÇA — Controle de Banca Inteligente
//  Arquivo: licenca.js  — v3 (Supabase + Painel Admin)
// ============================================================

const ADMIN_EMAIL = 'cbest07@gmail.com';
const TRIAL_DIAS  = 7;
const SUPA_URL    = 'https://tjzcgfjdhunqfifxgyyy.supabase.co';
const SUPA_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqemNnZmpkaHVucWZpZnhneXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODUxMDUsImV4cCI6MjA5NTc2MTEwNX0.JJYKvSn_VOdWwhfe37diLBJ5ngF4NQvhwrnCwKokzRg';

// ----------------------------------------------------------------
// Helpers internos
// ----------------------------------------------------------------
function diasRestantes(expiracao) {
  const diff = new Date(expiracao) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function dataExpiracaoPara(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

async function supaFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
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

// ----------------------------------------------------------------
// VERIFICAR LICENÇA (chamado nas páginas protegidas)
// ----------------------------------------------------------------
async function verificarLicenca(email) {
  if (!email) return { ativa: false, motivo: 'Sessão inválida. Faça login novamente.', tipo: null };
  if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return { ativa: true, tipo: 'admin', restam: 9999 };
  }

  try {
    const rows = await supaFetch(
      'licencas?email=eq.' + encodeURIComponent(email.trim().toLowerCase()) +
      '&order=expiracao.desc&limit=1&select=*'
    );

    if (!rows || rows.length === 0) {
      return { ativa: false, motivo: 'Nenhuma licença encontrada. Contate o administrador.', tipo: null };
    }

    const lic = rows[0];
    const restam = diasRestantes(lic.expiracao);

    if (restam <= 0) {
      const tipo = lic.tipo || 'trial';
      return {
        ativa: false,
        motivo: tipo === 'trial'
          ? 'Seu período de teste expirou. Contate o administrador para ativar sua licença.'
          : 'Sua licença expirou. Contate o administrador para renovar.',
        tipo
      };
    }

    return { ativa: true, tipo: lic.tipo || 'trial', restam, expira: lic.expiracao };

  } catch (e) {
    console.error('Erro ao verificar licença:', e);
    return { ativa: false, motivo: 'Erro ao verificar licença. Tente novamente.', tipo: null };
  }
}

// ----------------------------------------------------------------
// ATIVAR TRIAL (chamado no cadastro)
// ----------------------------------------------------------------
async function liberarLicenca(email, dataFim, tipo = 'trial') {
  const emailNorm = email.trim().toLowerCase();

  const existentes = await supaFetch('licencas?email=eq.' + encodeURIComponent(emailNorm) + '&select=id');

  if (existentes && existentes.length > 0) {
    await supaFetch('licencas?email=eq.' + encodeURIComponent(emailNorm), 'PATCH', {
      expiracao: dataFim,
      tipo: tipo,
      liberado_em: new Date().toISOString()
    });
  } else {
    await supaFetch('licencas', 'POST', {
      email: emailNorm,
      expiracao: dataFim,
      tipo: tipo,
      liberado_em: new Date().toISOString()
    });
  }
}

async function ativarTrial(email) {
  const dataFim = dataExpiracaoPara(TRIAL_DIAS);
  await liberarLicenca(email, dataFim, 'trial');
}

// ----------------------------------------------------------------
// TELA DE ACESSO BLOQUEADO
// ----------------------------------------------------------------
function mostrarTelaAcessoBloqueado(email, motivo, tipo) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;font-family:'Inter',sans-serif;padding:20px;">
      <div style="max-width:480px;width:100%;background:#071226;border:1px solid rgba(255,77,109,.25);border-radius:24px;padding:40px;text-align:center;">
        <div style="font-size:56px;margin-bottom:20px;">🔒</div>
        <h2 style="color:white;font-size:24px;font-weight:800;margin-bottom:12px;">Acesso Bloqueado</h2>
        <p style="color:#94a3b8;font-size:15px;margin-bottom:28px;line-height:1.6;">${motivo}</p>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px;margin-bottom:28px;">
          <p style="color:#64748b;font-size:12px;margin-bottom:4px;">Conta</p>
          <p style="color:#818cf8;font-size:14px;font-weight:600;">${email}</p>
        </div>
        <button onclick="localStorage.clear();window.location.href='login.html'"
          style="width:100%;padding:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">
          Voltar ao Login
        </button>
      </div>
    </div>`;
}

// ----------------------------------------------------------------
// PAINEL ADMIN — renderizado no dashboard.html
// ----------------------------------------------------------------
async function renderizarPainelAdmin(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div id="adminPanel" style="background:#071226;border:1px solid rgba(79,70,229,.3);border-radius:20px;padding:24px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <h3 style="color:white;font-size:18px;font-weight:700;">👑 Painel de Licenças</h3>
        <button onclick="window.CBI_LICENCA._abrirModalNovaLicenca()"
          style="padding:10px 20px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">
          + Liberar Licença
        </button>
      </div>

      <div id="formNovaLicenca" style="display:none;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px;margin-bottom:18px;">
        <p style="color:#94a3b8;font-size:13px;font-weight:600;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;">Nova Licença / Renovação</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">
          <input id="adminEmail" type="email" placeholder="Email do assinante"
            style="flex:1;min-width:200px;padding:12px;background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:white;font-size:14px;" />
          <select id="adminTipo"
            style="padding:12px;background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:white;font-size:14px;">
            <option value="trial">Trial (7 dias)</option>
            <option value="mensal">Mensal (30 dias)</option>
            <option value="trimestral">Trimestral (90 dias)</option>
            <option value="semestral">Semestral (180 dias)</option>
            <option value="anual">Anual (365 dias)</option>
          </select>
          <button onclick="window.CBI_LICENCA._confirmarLicenca()"
            style="padding:12px 20px;background:#00e5a0;color:#020617;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:14px;">
            ✓ Confirmar
          </button>
          <button onclick="document.getElementById('formNovaLicenca').style.display='none'"
            style="padding:12px 16px;background:rgba(255,255,255,.05);color:#94a3b8;border:1px solid rgba(255,255,255,.1);border-radius:10px;cursor:pointer;font-size:14px;">
            Cancelar
          </button>
        </div>
        <div id="adminMsg" style="display:none;margin-top:10px;padding:10px;border-radius:8px;font-size:13px;"></div>
      </div>

      <div id="listaLicencas">
        <p style="color:#64748b;font-size:13px;">Carregando licenças...</p>
      </div>
    </div>`;

  await _carregarLicencas();
}

async function _carregarLicencas() {
  const lista = document.getElementById('listaLicencas');
  if (!lista) return;

  try {
    const rows = await supaFetch('licencas?order=liberado_em.desc&select=*');

    if (!rows || rows.length === 0) {
      lista.innerHTML = '<p style="color:#64748b;font-size:13px;padding:10px 0;">Nenhuma licença cadastrada ainda.</p>';
      return;
    }

    const linhas = rows.map(lic => {
      const restam = diasRestantes(lic.expiracao);
      const ativa  = restam > 0;
      const corStatus = ativa ? (restam <= 3 ? '#f59e0b' : '#00e5a0') : '#ff4d6d';
      const bgStatus  = ativa ? (restam <= 3 ? 'rgba(245,158,11,.1)' : 'rgba(0,229,160,.1)') : 'rgba(255,77,109,.1)';
      const labelStatus = ativa ? (restam <= 3 ? `⚠ ${restam}d restantes` : `✓ ${restam}d restantes`) : '✗ Expirada';
      const labelTipo = { trial: 'Trial', mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual', admin: 'Admin' }[lic.tipo] || lic.tipo;
      const dataExp = new Date(lic.expiracao).toLocaleDateString('pt-BR');

      return `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
        <div style="flex:1;min-width:160px;">
          <p style="color:white;font-size:14px;font-weight:600;">${lic.email}</p>
          <p style="color:#64748b;font-size:12px;margin-top:2px;">Expira: ${dataExp} · Tipo: ${labelTipo}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="background:${bgStatus};color:${corStatus};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;">${labelStatus}</span>
          <button onclick="window.CBI_LICENCA._renovarRapido('${lic.email}', '${lic.tipo || 'mensal'}')"
            style="padding:6px 12px;background:rgba(79,70,229,.15);color:#818cf8;border:1px solid rgba(79,70,229,.3);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
            Renovar
          </button>
          <button onclick="window.CBI_LICENCA._revogarLicenca('${lic.email}')"
            style="padding:6px 12px;background:rgba(220,38,38,.1);color:#ef4444;border:1px solid rgba(220,38,38,.2);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
            Revogar
          </button>
        </div>
      </div>`;
    }).join('');

    const total     = rows.length;
    const ativas    = rows.filter(r => diasRestantes(r.expiracao) > 0).length;
    const expiradas = total - ativas;

    lista.innerHTML = `
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <div style="background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);border-radius:10px;padding:10px 16px;text-align:center;">
          <p style="color:#00e5a0;font-size:20px;font-weight:800;">${ativas}</p>
          <p style="color:#64748b;font-size:11px;">Ativas</p>
        </div>
        <div style="background:rgba(255,77,109,.08);border:1px solid rgba(255,77,109,.2);border-radius:10px;padding:10px 16px;text-align:center;">
          <p style="color:#ff4d6d;font-size:20px;font-weight:800;">${expiradas}</p>
          <p style="color:#64748b;font-size:11px;">Expiradas</p>
        </div>
        <div style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:10px 16px;text-align:center;">
          <p style="color:#818cf8;font-size:20px;font-weight:800;">${total}</p>
          <p style="color:#64748b;font-size:11px;">Total</p>
        </div>
      </div>
      <div>${linhas}</div>`;

  } catch (e) {
    lista.innerHTML = `<p style="color:#ff4d6d;font-size:13px;">Erro ao carregar licenças: ${e.message}</p>`;
  }
}

function _abrirModalNovaLicenca() {
  const form = document.getElementById('formNovaLicenca');
  if (form) {
    form.style.display = 'block';
    document.getElementById('adminEmail').focus();
    document.getElementById('adminMsg').style.display = 'none';
  }
}

async function _confirmarLicenca() {
  const emailEl = document.getElementById('adminEmail');
  const tipoEl  = document.getElementById('adminTipo');
  const msgEl   = document.getElementById('adminMsg');
  const email   = emailEl ? emailEl.value.trim().toLowerCase() : '';
  const tipo    = tipoEl  ? tipoEl.value : 'trial';

  if (!email) {
    msgEl.style.display = 'block';
    msgEl.style.background = 'rgba(255,77,109,.1)';
    msgEl.style.color = '#fca5a5';
    msgEl.textContent = 'Por favor, informe o email do assinante.';
    return;
  }

  const diasMap = { trial: 7, mensal: 30, trimestral: 90, semestral: 180, anual: 365 };
  const dias    = diasMap[tipo] || 7;
  const dataFim = dataExpiracaoPara(dias);

  msgEl.style.display = 'block';
  msgEl.style.background = 'rgba(99,102,241,.1)';
  msgEl.style.color = '#818cf8';
  msgEl.textContent = 'Salvando...';

  try {
    await liberarLicenca(email, dataFim, tipo);
    msgEl.style.background = 'rgba(0,229,160,.1)';
    msgEl.style.color = '#00e5a0';
    msgEl.textContent = `✓ Licença (${tipo}) liberada para ${email} por ${dias} dias!`;
    emailEl.value = '';
    setTimeout(() => {
      document.getElementById('formNovaLicenca').style.display = 'none';
      _carregarLicencas();
    }, 1800);
  } catch (e) {
    msgEl.style.background = 'rgba(255,77,109,.1)';
    msgEl.style.color = '#fca5a5';
    msgEl.textContent = 'Erro: ' + e.message;
  }
}

async function _renovarRapido(email, tipo) {
  const diasMap = { trial: 7, mensal: 30, trimestral: 90, semestral: 180, anual: 365 };
  const dias = diasMap[tipo] || 30;
  if (!confirm(`Renovar licença de ${email} por mais ${dias} dias (${tipo})?`)) return;
  try {
    await liberarLicenca(email, dataExpiracaoPara(dias), tipo);
    await _carregarLicencas();
  } catch (e) {
    alert('Erro ao renovar: ' + e.message);
  }
}

async function _revogarLicenca(email) {
  if (!confirm(`Revogar acesso de ${email}? O usuário perderá o acesso imediatamente.`)) return;
  try {
    await supaFetch('licencas?email=eq.' + encodeURIComponent(email), 'PATCH', {
      expiracao: new Date('2000-01-01').toISOString(),
      liberado_em: new Date().toISOString()
    });
    await _carregarLicencas();
  } catch (e) {
    alert('Erro ao revogar: ' + e.message);
  }
}

// ----------------------------------------------------------------
// Namespace global
// ----------------------------------------------------------------
window.CBI_LICENCA = {
  ADMIN_EMAIL,
  verificarLicenca,
  liberarLicenca,
  ativarTrial,
  diasRestantes,
  dataExpiracaoPara,
  mostrarTelaAcessoBloqueado,
  renderizarPainelAdmin,
  _abrirModalNovaLicenca,
  _confirmarLicenca,
  _renovarRapido,
  _revogarLicenca,
  _carregarLicencas
};
