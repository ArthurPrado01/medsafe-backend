-- ============================================================
--  Medsafe — Script de criação do banco de dados
--  Execute no Railway: Dashboard > PostgreSQL > Query
-- ============================================================

-- ─── ENUMS ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "Perfil" AS ENUM ('usuario', 'cuidador', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FrequenciaMedicamento" AS ENUM (
    'diario', 'duasVezesDia', 'tresVezesDia',
    'semanalDom', 'semanalSeg', 'semanalTer', 'semanalQua',
    'semanalQui', 'semanalSex', 'semanalSab',
    'quinzenal', 'mensal'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntervaloAlerta" AS ENUM (
    'cincoMin', 'dezMin', 'quinzeMin', 'trintaMin', 'umaHora'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MaximoTentativas" AS ENUM (
    'uma', 'duas', 'tres', 'quatro', 'cinco'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatusMedicamento" AS ENUM (
    'pendente', 'tomado', 'atrasado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── FUNÇÃO PARA AUTO-ATUALIZAR atualizadoEm ──────────────

CREATE OR REPLACE FUNCTION definir_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW."atualizadoEm" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── TABELAS ──────────────────────────────────────────────

-- Usuários (pacientes, cuidadores e admins)
CREATE TABLE IF NOT EXISTS "Usuario" (
  "id"           TEXT         NOT NULL,
  "nome"         TEXT         NOT NULL,
  "email"        TEXT         NOT NULL,
  "telefone"     TEXT,
  "senhaHash"    TEXT         NOT NULL,
  "perfil"       "Perfil"     NOT NULL DEFAULT 'usuario',
  "urlFoto"      TEXT,
  "tokenFcm"     TEXT,
  "criadoEm"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletadoEm"   TIMESTAMP(3),

  CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "Usuario"("email");

DROP TRIGGER IF EXISTS "Usuario_atualizado_em" ON "Usuario";
CREATE TRIGGER "Usuario_atualizado_em"
  BEFORE UPDATE ON "Usuario"
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

-- ─────────────────────────────────────────────────────────

-- Medicamentos cadastrados por cada paciente
CREATE TABLE IF NOT EXISTS "Medicamento" (
  "id"               TEXT                    NOT NULL,
  "usuarioId"        TEXT                    NOT NULL,
  "nome"             TEXT                    NOT NULL,
  "dose"             TEXT                    NOT NULL,
  "horario"          TEXT                    NOT NULL,  -- formato "HH:mm"
  "frequencia"       "FrequenciaMedicamento" NOT NULL,
  "intervaloAlerta"  "IntervaloAlerta"       NOT NULL,
  "maximoTentativas" "MaximoTentativas"      NOT NULL,
  "nomeCuidador"     TEXT,
  "telefoneCuidador" TEXT,
  "estoqueRestante"  INTEGER,
  "ativo"            BOOLEAN                 NOT NULL DEFAULT TRUE,
  "criadoEm"         TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"     TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Medicamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Medicamento_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Medicamento_usuarioId_idx" ON "Medicamento"("usuarioId");
CREATE INDEX IF NOT EXISTS "Medicamento_ativo_idx"     ON "Medicamento"("ativo");

DROP TRIGGER IF EXISTS "Medicamento_atualizado_em" ON "Medicamento";
CREATE TRIGGER "Medicamento_atualizado_em"
  BEFORE UPDATE ON "Medicamento"
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

-- ─────────────────────────────────────────────────────────

-- Registro de cada dose (tomada, atrasada ou pendente)
CREATE TABLE IF NOT EXISTS "EventoMedicamento" (
  "id"            TEXT                NOT NULL,
  "medicamentoId" TEXT                NOT NULL,
  "usuarioId"     TEXT                NOT NULL,
  "agendadoEm"    TIMESTAMP(3)        NOT NULL,
  "confirmadoEm"  TIMESTAMP(3),
  "status"        "StatusMedicamento" NOT NULL DEFAULT 'pendente',
  "tentativa"     INTEGER             NOT NULL DEFAULT 1,
  "criadoEm"      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventoMedicamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventoMedicamento_medicamentoId_fkey"
    FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EventoMedicamento_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EventoMedicamento_usuarioId_idx"     ON "EventoMedicamento"("usuarioId");
CREATE INDEX IF NOT EXISTS "EventoMedicamento_medicamentoId_idx" ON "EventoMedicamento"("medicamentoId");
CREATE INDEX IF NOT EXISTS "EventoMedicamento_agendadoEm_idx"    ON "EventoMedicamento"("agendadoEm");
CREATE INDEX IF NOT EXISTS "EventoMedicamento_status_idx"        ON "EventoMedicamento"("status");

-- ─────────────────────────────────────────────────────────

-- Vínculo entre cuidador e idoso (paciente)
CREATE TABLE IF NOT EXISTS "CuidadorIdoso" (
  "id"           TEXT         NOT NULL,
  "cuidadorId"   TEXT         NOT NULL,
  "idosoId"      TEXT         NOT NULL,
  "ativo"        BOOLEAN      NOT NULL DEFAULT TRUE,
  "criadoEm"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CuidadorIdoso_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CuidadorIdoso_cuidadorId_idosoId_key" UNIQUE ("cuidadorId", "idosoId"),
  CONSTRAINT "CuidadorIdoso_cuidadorId_fkey"
    FOREIGN KEY ("cuidadorId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CuidadorIdoso_idosoId_fkey"
    FOREIGN KEY ("idosoId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CuidadorIdoso_cuidadorId_idx" ON "CuidadorIdoso"("cuidadorId");
CREATE INDEX IF NOT EXISTS "CuidadorIdoso_idosoId_idx"    ON "CuidadorIdoso"("idosoId");

DROP TRIGGER IF EXISTS "CuidadorIdoso_atualizado_em" ON "CuidadorIdoso";
CREATE TRIGGER "CuidadorIdoso_atualizado_em"
  BEFORE UPDATE ON "CuidadorIdoso"
  FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

-- ─────────────────────────────────────────────────────────

-- Códigos de redefinição de senha (expiram em 15 min)
CREATE TABLE IF NOT EXISTS "RedefinicaoSenha" (
  "id"        TEXT         NOT NULL,
  "usuarioId" TEXT         NOT NULL,
  "codigo"    TEXT         NOT NULL,
  "expiraEm"  TIMESTAMP(3) NOT NULL,
  "usadoEm"   TIMESTAMP(3),
  "criadoEm"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RedefinicaoSenha_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RedefinicaoSenha_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RedefinicaoSenha_usuarioId_idx" ON "RedefinicaoSenha"("usuarioId");
CREATE INDEX IF NOT EXISTS "RedefinicaoSenha_expiraEm_idx"  ON "RedefinicaoSenha"("expiraEm");

-- ─── FIM ──────────────────────────────────────────────────
