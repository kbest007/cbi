-- ============================================================
--  CBI — Setup da tabela de licenças no Supabase
--  Execute este SQL no Editor SQL do seu projeto Supabase:
--  https://supabase.com/dashboard → SQL Editor → New query
-- ============================================================

-- 1. Criar tabela de licenças (se ainda não existir)
CREATE TABLE IF NOT EXISTS licencas (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'trial',
  data_expiracao TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Índice único por email (um registro por usuário)
CREATE UNIQUE INDEX IF NOT EXISTS licencas_email_idx ON licencas (email);

-- 3. Habilitar Row Level Security
ALTER TABLE licencas ENABLE ROW LEVEL SECURITY;

-- 4. Política: leitura pública com anon key (necessário para verificação via frontend)
DROP POLICY IF EXISTS "Leitura pública" ON licencas;
CREATE POLICY "Leitura pública"
  ON licencas FOR SELECT
  USING (true);

-- 5. Política: inserção e atualização pública (a segurança está no frontend via admin)
DROP POLICY IF EXISTS "Inserção pública" ON licencas;
CREATE POLICY "Inserção pública"
  ON licencas FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Atualização pública" ON licencas;
CREATE POLICY "Atualização pública"
  ON licencas FOR UPDATE
  USING (true);

-- 6. (Opcional) Seed inicial — licença permanente para o admin
INSERT INTO licencas (email, tipo, data_expiracao)
VALUES ('cbest07@gmail.com', 'admin', '2099-12-31T00:00:00Z')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
--  PRONTO! Após executar, o sistema de licenças está ativo.
-- ============================================================
