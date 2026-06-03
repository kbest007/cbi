// ============================================================
//  SISTEMA DE LICENÇA — Controle de Banca Inteligente
//  Arquivo: licenca.js  — v2 (Supabase)
// ============================================================

const ADMIN_EMAIL = 'cbest07@gmail.com';
const TRIAL_DIAS  = 7;
const LS_SESSAO   = 'cbi_email_sessao';

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

// Funções de licença que dependem de window.CBI_DB
async function liberarLicenca(email, dataFim) {
  // Exemplo de uso de window.CBI_DB.supaFetch se necessário
  if (!window.CBI_DB) throw new Error("CBI_DB não inicializado");
  await window.CBI_DB.supaFetch('licencas', 'POST', {
    email: email,
    data_expiracao: dataFim
  });
}

async function ativarTrial(email) {
  const dataFim = dataExpiracaoPara(TRIAL_DIAS);
  await liberarLicenca(email, dataFim);
}

// Namespace para ser acessível globalmente
window.CBI_LICENCA = { liberarLicenca, ativarTrial, diasRestantes, dataExpiracaoPara };
