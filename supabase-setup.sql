-- ============================================================
--  CBI — Setup completo das tabelas no Supabase
--  Execute este SQL no Editor SQL do seu projeto Supabase:
--  https://supabase.com/dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. TABELA DE LICENÇAS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS licencas (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'trial',
  data_expiracao TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS licencas_email_idx ON licencas (email);

ALTER TABLE licencas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública" ON licencas;
CREATE POLICY "Leitura pública"
  ON licencas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserção pública" ON licencas;
CREATE POLICY "Inserção pública"
  ON licencas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização pública" ON licencas;
CREATE POLICY "Atualização pública"
  ON licencas FOR UPDATE USING (true);

-- Seed: licença permanente para o admin
INSERT INTO licencas (email, tipo, data_expiracao)
VALUES ('cbest07@gmail.com', 'admin', '2099-12-31T00:00:00Z')
ON CONFLICT (email) DO NOTHING;


-- ── 2. TABELA DE PERFIS (banca inicial por usuário) ─────────
CREATE TABLE IF NOT EXISTS perfis (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  saldo_inicial NUMERIC DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário lê próprio perfil" ON perfis;
CREATE POLICY "Usuário lê próprio perfil"
  ON perfis FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário insere próprio perfil" ON perfis;
CREATE POLICY "Usuário insere próprio perfil"
  ON perfis FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário atualiza próprio perfil" ON perfis;
CREATE POLICY "Usuário atualiza próprio perfil"
  ON perfis FOR UPDATE USING (auth.uid() = id);


-- ── 3. TABELA DE OPERAÇÕES (separadas por usuário) ──────────
CREATE TABLE IF NOT EXISTS operacoes (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo                  TEXT,
  valor                 NUMERIC DEFAULT 0,
  mercado               TEXT,
  resultado_principal   NUMERIC DEFAULT 0,
  resultado_opcionais   NUMERIC DEFAULT 0,
  descricao             TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operacoes_user_id_idx ON operacoes (user_id);

ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê e gerencia apenas suas próprias operações
DROP POLICY IF EXISTS "Usuário lê próprias operações" ON operacoes;
CREATE POLICY "Usuário lê próprias operações"
  ON operacoes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário insere próprias operações" ON operacoes;
CREATE POLICY "Usuário insere próprias operações"
  ON operacoes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário deleta próprias operações" ON operacoes;
CREATE POLICY "Usuário deleta próprias operações"
  ON operacoes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário atualiza próprias operações" ON operacoes;
CREATE POLICY "Usuário atualiza próprias operações"
  ON operacoes FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
--  PRONTO! Após executar, o sistema está separado por usuário.
-- ============================================================
