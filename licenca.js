// ============================================================
//  SISTEMA DE LICENÇA — Controle de Banca Inteligente
//  Arquivo: licenca.js  — v2 (Supabase)
// ============================================================

const ADMIN_EMAIL = 'cbest07@gmail.com';
const TRIAL_DIAS  = 7;
const LS_SESSAO   = 'cbi_email_sessao';

const SUPA_URL    = 'https://tjzcgfjdhunqfifxgyyy.supabase.co';
const SUPA_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqemNnZmpkaHVucWZpZnhneXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODUxMDUsImV4cCI6MjA5NTc2MTEwNX0.JJYKvSn_VOdWwhfe37diLBJ5ngF4NQvhwrnCwKokzRg';

// ----------------------------------------------------------------
// Helpers de data
// ----------------------------------------------------------------
function diasRestantes(dataExpiracao) {
  const diff = new Date(dataExpiracao) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function dataExpiracaoPara(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

// ----------------------------------------------------------------
// Requisições ao Supabase (REST direto — sem SDK)
// ----------------------------------------------------------------
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ----------------------------------------------------------------
// API pública (todas assíncronas agora)
// ----------------------------------------------------------------

// Cria trial de 7 dias ao cadastrar (só se não existir licença)
async function ativarTrial(email) {
  const norm = email.trim().toLowerCase();
  // Verifica se já existe
  const rows = await supaFetch(`licencas?email=eq.${encodeURIComponent(norm)}&select=email`);
  if (rows && rows.length > 0) return; // já tem, não sobrescreve

  await supaFetch('licencas', 'POST', {
    email: norm,
    tipo: 'trial',
    liberado_em: new Date().toISOString(),
    expiracao: dataExpiracaoPara(TRIAL_DIAS)
  });
}

// Admin libera licença com data customizada
async function liberarLicenca(email, dataFim) {
  const norm = email.trim().toLowerCase();
  const expiracao = dataFim
    ? new Date(dataFim).toISOString()
    : dataExpiracaoPara(30);

  // Upsert: atualiza se existe, insere se não existe
  await supaFetch('licencas?email=eq.' + encodeURIComponent(norm), 'DELETE');
  await supaFetch('licencas', 'POST', {
    email: norm,
    tipo: 'ativa',
    liberado_em: new Date().toISOString(),
    expiracao
  });
}

async function revogarLicenca(email) {
  const norm = email.trim().toLowerCase();
  await supaFetch('licencas?email=eq.' + encodeURIComponent(norm), 'DELETE');
}

async function verificarLicenca(email) {
  const norm = email.trim().toLowerCase();
  try {
    const rows = await supaFetch(`licencas?email=eq.${encodeURIComponent(norm)}&select=*`);
    if (!rows || rows.length === 0) {
      return { ativa: false, motivo: 'Sem licença cadastrada.', semLicenca: true };
    }
    const lic = rows[0];
    const restam = diasRestantes(lic.expiracao);
    if (restam <= 0) {
      const msg = lic.tipo === 'trial'
        ? 'Seu período de teste gratuito encerrou.'
        : 'Sua licença expirou.';
      return { ativa: false, motivo: msg, tipo: lic.tipo };
    }
    return { ativa: true, restam, tipo: lic.tipo, expiracao: lic.expiracao };
  } catch (e) {
    console.error('Erro ao verificar licença:', e);
    return { ativa: false, motivo: 'Erro ao verificar licença. Tente novamente.', semLicenca: true };
  }
}

async function listarTodasLicencas() {
  const rows = await supaFetch('licencas?select=*&order=liberado_em.desc');
  return rows || [];
}

// ----------------------------------------------------------------
// Tela de acesso bloqueado
// ----------------------------------------------------------------
function mostrarTelaAcessoBloqueado(email, motivo, tipo) {
  const isTrial = tipo === 'trial';
  const icone = isTrial ? '⏰' : '🔒';
  const titulo = isTrial ? 'Período de Teste Encerrado' : 'Acesso Restrito';
  const detalhe = isTrial
    ? 'Seu trial gratuito de 7 dias chegou ao fim. Entre em contato com o administrador para assinar o plano.'
    : 'Entre em contato com o administrador do sistema para solicitar a liberação do seu acesso.';

  document.body.innerHTML = `
    <style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif;}
      body{background:#020617;min-height:100vh;display:flex;align-items:center;justify-content:center;}
      .glow{position:fixed;width:600px;height:600px;background:${isTrial ? '#7c3aed' : '#dc2626'};opacity:.08;filter:blur(160px);border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%);}
      .card{background:rgba(15,23,42,.9);border:1px solid ${isTrial ? 'rgba(124,58,237,.25)' : 'rgba(220,38,38,.2)'};border-radius:28px;padding:40px;max-width:440px;width:100%;text-align:center;position:relative;z-index:2;}
      .icon{font-size:52px;margin-bottom:20px;}
      h2{color:white;font-size:24px;font-weight:800;margin-bottom:10px;}
      p{color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:6px;}
      .badge{color:${isTrial ? '#a78bfa' : '#ef4444'};font-weight:600;font-size:13px;background:${isTrial ? 'rgba(124,58,237,.12)' : 'rgba(220,38,38,.1)'};padding:8px 16px;border-radius:10px;display:inline-block;margin:12px 0;}
      .motivo{color:${isTrial ? '#c4b5fd' : '#fca5a5'};font-size:13px;margin-bottom:8px;font-weight:600;}
      .detalhe{color:#64748b;font-size:13px;margin-bottom:28px;line-height:1.6;}
      .btn{display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;}
      .hint{margin-top:20px;color:#475569;font-size:12px;}
    </style>
    <div class="glow"></div>
    <div class="card">
      <div class="icon">${icone}</div>
      <h2>${titulo}</h2>
      <div class="badge">${email}</div>
      <p class="motivo">${motivo}</p>
      <p class="detalhe">${detalhe}</p>
      <button class="btn" onclick="localStorage.removeItem('${LS_SESSAO}');window.location.href='login.html'">Voltar ao Login</button>
      <p class="hint">CBI — Controle de Banca Inteligente</p>
    </div>
  `;
}

// ----------------------------------------------------------------
// Proteção de página (agora assíncrona)
// ----------------------------------------------------------------
async function protegerPagina() {
  const email = localStorage.getItem(LS_SESSAO);
  if (!email) { window.location.href = 'login.html'; return null; }
  if (email === ADMIN_EMAIL) return { email, isAdmin: true };

  const lic = await verificarLicenca(email);
  if (!lic.ativa) {
    mostrarTelaAcessoBloqueado(email, lic.motivo, lic.tipo);
    return null;
  }
  return { email, isAdmin: false, licenca: lic };
}

// ----------------------------------------------------------------
// Painel de Administração
// ----------------------------------------------------------------
async function renderizarPainelAdmin(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  async function refresh() {
    container.innerHTML = `<p style="color:#64748b;font-size:13px;padding:16px 0;">Carregando...</p>`;

    let entradas = [];
    try {
      entradas = await listarTodasLicencas();
    } catch(e) {
      container.innerHTML = `<p style="color:#ef4444;font-size:13px;">Erro ao carregar licenças.</p>`;
      return;
    }

    const linhas = entradas.map(lic => {
      const restam = diasRestantes(lic.expiracao);
      const expirado = restam <= 0;
      const isTrial = lic.tipo === 'trial';
      const cor = expirado ? '#ff4d6d' : restam <= 3 ? '#f59e0b' : '#00e5a0';
      const statusTxt = expirado
        ? (isTrial ? 'Trial expirado' : 'Expirada')
        : `${restam} dia(s) restante(s)`;
      const tipoBadge = isTrial
        ? `<span style="font-size:10px;background:rgba(124,58,237,.2);color:#a78bfa;padding:2px 8px;border-radius:6px;font-weight:700;">TRIAL</span>`
        : `<span style="font-size:10px;background:rgba(0,229,160,.1);color:#00e5a0;padding:2px 8px;border-radius:6px;font-weight:700;">ATIVA</span>`;

      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.05);flex-wrap:wrap;gap:10px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="color:white;font-size:13px;font-weight:600;">${lic.email}</span>
              ${tipoBadge}
            </div>
            <div style="color:#64748b;font-size:12px;">Expira em: ${formatarData(lic.expiracao)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="color:${cor};font-size:12px;font-weight:700;">${statusTxt}</span>
            <button onclick="abrirRenovar('${lic.email}')" style="padding:6px 12px;background:rgba(79,70,229,.2);border:1px solid rgba(79,70,229,.4);color:#818cf8;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;">Renovar</button>
            <button onclick="revogarLicencaAdmin('${lic.email}')" style="padding:6px 12px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);color:#ef4444;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;">Revogar</button>
          </div>
        </div>`;
    }).join('');

    const semLicencas = entradas.length === 0
      ? `<p style="color:#64748b;font-size:13px;padding:16px 0;">Nenhum usuário cadastrado ainda.</p>`
      : '';

    const hoje = new Date().toISOString().split('T')[0];
    const padrao30 = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

    container.innerHTML = `
      <!-- LIBERAR NOVA LICENÇA -->
      <div style="background:#071226;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:24px;margin-bottom:16px;">
        <h3 style="font-size:16px;font-weight:800;color:white;margin-bottom:6px;">🔑 Liberar Nova Licença</h3>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:18px;">Informe o e-mail e a data de expiração da licença do usuário.</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <input id="adminEmailInput" type="email" placeholder="email@usuario.com"
            style="padding:13px 16px;background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:white;font-size:14px;width:100%;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <div style="flex:1;min-width:160px;">
              <label style="color:#64748b;font-size:12px;display:block;margin-bottom:6px;">Data de expiração</label>
              <input id="adminDataFim" type="date" min="${hoje}" value="${padrao30}"
                style="width:100%;padding:12px 14px;background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:white;font-size:14px;color-scheme:dark;">
            </div>
            <button onclick="liberarLicencaAdmin()"
              style="padding:13px 22px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;border-radius:12px;color:white;font-size:14px;font-weight:700;cursor:pointer;align-self:flex-end;white-space:nowrap;">
              ✓ Liberar Acesso
            </button>
          </div>
        </div>
        <div id="adminMsg" style="margin-top:12px;font-size:13px;display:none;padding:10px 14px;border-radius:10px;"></div>
      </div>

      <!-- MODAL RENOVAR -->
      <div id="modalRenovar" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;align-items:center;justify-content:center;">
        <div style="background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px;width:100%;max-width:380px;margin:20px;">
          <h3 style="color:white;font-size:16px;font-weight:800;margin-bottom:6px;">Renovar Licença</h3>
          <p id="modalEmailLabel" style="color:#94a3b8;font-size:13px;margin-bottom:18px;"></p>
          <label style="color:#64748b;font-size:12px;display:block;margin-bottom:6px;">Nova data de expiração</label>
          <input id="modalDataFim" type="date" min="${hoje}" value="${padrao30}"
            style="width:100%;padding:12px 14px;background:#020617;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:white;font-size:14px;color-scheme:dark;margin-bottom:16px;">
          <div style="display:flex;gap:10px;">
            <button onclick="fecharModal()" style="flex:1;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#94a3b8;border-radius:12px;font-size:14px;cursor:pointer;font-weight:600;">Cancelar</button>
            <button onclick="confirmarRenovar()" style="flex:1;padding:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;color:white;border-radius:12px;font-size:14px;cursor:pointer;font-weight:700;">Confirmar</button>
          </div>
        </div>
      </div>

      <!-- LISTA DE LICENÇAS -->
      <div style="background:#071226;border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:24px;">
        <h3 style="font-size:16px;font-weight:800;color:white;margin-bottom:4px;">📋 Usuários Cadastrados</h3>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:18px;">Trials e licenças ativas no sistema.</p>
        ${semLicencas}${linhas}
      </div>
    `;

    let emailRenovar = '';

    window.abrirRenovar = function(email) {
      emailRenovar = email;
      document.getElementById('modalEmailLabel').textContent = email;
      document.getElementById('modalRenovar').style.display = 'flex';
    };
    window.fecharModal = function() {
      document.getElementById('modalRenovar').style.display = 'none';
    };
    window.confirmarRenovar = async function() {
      const data = document.getElementById('modalDataFim').value;
      if (!data) return;
      await liberarLicenca(emailRenovar, data);
      fecharModal();
      refresh();
    };

    window.liberarLicencaAdmin = async function() {
      const input = document.getElementById('adminEmailInput');
      const dataInput = document.getElementById('adminDataFim');
      const msg = document.getElementById('adminMsg');
      const email = (input.value || '').trim().toLowerCase();
      const dataFim = dataInput.value;

      if (!email || !email.includes('@')) {
        msg.style.display = 'block';
        msg.style.background = 'rgba(220,38,38,.1)';
        msg.style.color = '#fca5a5';
        msg.textContent = '⚠ Digite um e-mail válido.';
        return;
      }
      if (!dataFim) {
        msg.style.display = 'block';
        msg.style.background = 'rgba(220,38,38,.1)';
        msg.style.color = '#fca5a5';
        msg.textContent = '⚠ Selecione uma data de expiração.';
        return;
      }

      try {
        await liberarLicenca(email, dataFim);
        input.value = '';
        dataInput.value = padrao30;
        msg.style.display = 'block';
        msg.style.background = 'rgba(0,229,160,.08)';
        msg.style.color = '#86efac';
        msg.textContent = `✓ Licença liberada para ${email} até ${new Date(dataFim).toLocaleDateString('pt-BR')}`;
        setTimeout(() => { msg.style.display = 'none'; }, 5000);
        refresh();
      } catch(e) {
        msg.style.display = 'block';
        msg.style.background = 'rgba(220,38,38,.1)';
        msg.style.color = '#fca5a5';
        msg.textContent = '⚠ Erro ao liberar licença. Verifique o console.';
      }
    };

    window.revogarLicencaAdmin = async function(email) {
      if (confirm(`Revogar acesso de ${email}?`)) {
        await revogarLicenca(email);
        refresh();
      }
    };
  }

  refresh();
}

// Exporta
window.CBI_LICENCA = {
  ADMIN_EMAIL,
  ativarTrial,
  verificarLicenca,
  liberarLicenca,
  revogarLicenca,
  protegerPagina,
  renderizarPainelAdmin,
  diasRestantes
};
