TRUNCATE TABLE
  respostas_checklist,
  tb_historico_familiar,
  tb_encaminhamentos,
  tb_log_analises,
  tb_agendamentos,
  tb_avaliacoes,
  tb_pacientes,
  tb_acompanhantes
RESTART IDENTITY CASCADE;

CREATE OR REPLACE VIEW pacientes AS
 SELECT p.id,
    p.nome_criptografado,
    p.cpf_hash,
    p.data_nascimento,
    date_part('year'::text, age(p.data_nascimento::timestamp with time zone))::integer AS idade_anos,
    p.sexo,
    p.etnia,
    p.uf_nascimento,
    p.municipio_residencia,
    p.uf_residencia,
    p.prematuro,
    p.idade_gestacional_semanas,
    p.peso_nascimento_gramas,
    p.escolaridade,
    p.tem_diagnostico_autismo,
    p.tem_diagnostico_tdah,
    p.outras_comorbidades,
    p.medicamentos_uso,
    p.acompanhante_id,
    p.grau_parentesco,
    a.nome_criptografado AS acompanhante_nome_criptografado,
    a.telefone AS acompanhante_telefone,
    a.email AS acompanhante_email,
    p.diagnostico_confirmado_fxs,
    p.ativo,
    p.criado_por,
    p.criado_em,
    p.atualizado_em,
    pgp_sym_decrypt(p.nome_criptografado, current_setting('app.pgp_key', true))::text AS nome
   FROM tb_pacientes p
     LEFT JOIN tb_acompanhantes a ON a.id = p.acompanhante_id;

CREATE OR REPLACE VIEW avaliacoes AS
 SELECT a.id,
    a.paciente_id,
    a.usuario_id,
    a.data_avaliacao,
    a.diagnostico_previo_fxs,
    a.score_final,
    a.observacoes,
    a.status,
    a.criado_em,
    a.atualizado_em,
    CASE
      WHEN a.score_final IS NULL THEN NULL::boolean
      WHEN a.diagnostico_previo_fxs THEN false
      WHEN a.score_final >= (
            SELECT pt.limiar_score
            FROM parametro_triagem pt
            WHERE pt.ativo
              AND pt.sexo = (SELECT pac.sexo FROM tb_pacientes pac WHERE pac.id = a.paciente_id)
            LIMIT 1
      ) THEN true
      ELSE false
    END AS recomenda_exame
   FROM tb_avaliacoes a;
