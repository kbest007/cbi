// ============================================================
//  SISTEMA DE LICENÇA — Controle de Banca Inteligente
//  Arquivo: licenca.js
// ============================================================

const ADMIN_EMAIL = 'cbest07@gmail.com';
const TRIAL_DIAS  = 7;
const LS_SESSAO   = 'cbi_email_sessao';

function diasRestantes(dataExpiracao) {
  const diff = new Date(dataExpiracao) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function dataExpiracaoPara(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

async function verificarLicenca(email) {
  console.log("Verificando licença para:", email);
  return true; 
}

async function liberarLicenca(email, dataFim) {
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

window.CBI_LICENCA = { liberarLicenca, ativarTrial, diasRestantes, dataExpiracaoPara, verificarLicenca };