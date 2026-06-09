CREATE OR REPLACE VIEW acompanhantes AS
 SELECT id,
    nome_criptografado,
    cpf_hash,
    telefone,
    email,
    criado_em,
    atualizado_em,
    pgp_sym_decrypt(nome_criptografado, current_setting('app.pgp_key', true))::text AS nome
   FROM tb_acompanhantes;

CREATE OR REPLACE FUNCTION fn_acompanhantes_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_id integer;
BEGIN
    INSERT INTO tb_acompanhantes (nome_criptografado, cpf_hash, telefone, email)
    VALUES (
        pgp_sym_encrypt(NEW.nome, current_setting('app.pgp_key', true)),
        NEW.cpf_hash, NEW.telefone, NEW.email
    )
    RETURNING id INTO v_id;
    NEW.id := v_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acompanhantes_insert ON acompanhantes;
CREATE TRIGGER trg_acompanhantes_insert
    INSTEAD OF INSERT ON acompanhantes
    FOR EACH ROW EXECUTE FUNCTION fn_acompanhantes_insert();

CREATE OR REPLACE FUNCTION fn_pacientes_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_id integer;
BEGIN
    INSERT INTO tb_pacientes (
        nome_criptografado, cpf_hash, data_nascimento, sexo, etnia,
        uf_nascimento, municipio_residencia, uf_residencia, prematuro,
        idade_gestacional_semanas, peso_nascimento_gramas, escolaridade,
        tem_diagnostico_autismo, tem_diagnostico_tdah, outras_comorbidades,
        medicamentos_uso, acompanhante_id, grau_parentesco,
        diagnostico_confirmado_fxs, criado_por
    ) VALUES (
        pgp_sym_encrypt(NEW.nome, current_setting('app.pgp_key', true)),
        NEW.cpf_hash, NEW.data_nascimento, NEW.sexo, NEW.etnia,
        NEW.uf_nascimento, NEW.municipio_residencia, NEW.uf_residencia,
        COALESCE(NEW.prematuro, false), NEW.idade_gestacional_semanas,
        NEW.peso_nascimento_gramas, NEW.escolaridade,
        COALESCE(NEW.tem_diagnostico_autismo, false),
        COALESCE(NEW.tem_diagnostico_tdah, false),
        NEW.outras_comorbidades, NEW.medicamentos_uso, NEW.acompanhante_id,
        NEW.grau_parentesco, COALESCE(NEW.diagnostico_confirmado_fxs, false),
        NEW.criado_por
    )
    RETURNING id INTO v_id;
    NEW.id := v_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pacientes_insert ON pacientes;
CREATE TRIGGER trg_pacientes_insert
    INSTEAD OF INSERT ON pacientes
    FOR EACH ROW EXECUTE FUNCTION fn_pacientes_insert();
