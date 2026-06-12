-- Telefone próprio do paciente (antes só o acompanhante tinha telefone).
-- Aditivo e não destrutivo. Rode no Supabase (SQL Editor).
ALTER TABLE tb_pacientes ADD COLUMN IF NOT EXISTS telefone VARCHAR;
