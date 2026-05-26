-- Tabela de mapeamento @lid → telefone real
-- Permite resolver futuras mensagens fromMe com @lid sem criar conversas fantasma.
-- Populada automaticamente pelo webhook toda vez que um @lid é resolvido com sucesso.

CREATE TABLE IF NOT EXISTS wapi_lid_phone_map (
  lid_digits   TEXT NOT NULL,
  phone_digits TEXT NOT NULL,
  instance_id  UUID NOT NULL REFERENCES wapi_instances(id) ON DELETE CASCADE,
  company_id   UUID,
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lid_digits, instance_id)
);

CREATE INDEX IF NOT EXISTS wapi_lid_phone_map_phone_idx
  ON wapi_lid_phone_map (phone_digits, instance_id);

COMMENT ON TABLE wapi_lid_phone_map IS
  'Cache de mapeamento WhatsApp @lid → número de telefone real. '
  'Populado automaticamente ao resolver @lid no webhook. '
  'Permite que mensagens enviadas pelo celular da atendente apareçam na conversa correta.';
