-- SMS Inbox schema.
-- One conversation per remote phone number (the lead's phone, never our own).
-- Messages are the raw ClickSend rows, both directions, with a source tag
-- so we know if it came from the inbound webhook, the app's own send, or a
-- lazy history-fetch on first thread open.
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  phone_e164 TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  contact_name TEXT,
  unread BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'open',
  classification TEXT,
  classification_confidence REAL,
  hydrated BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx
  ON conversations (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS conversations_unread_idx
  ON conversations (unread, last_message_at DESC) WHERE unread = true;

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  clicksend_id TEXT UNIQUE,
  direction TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  custom_string TEXT,
  status TEXT,
  source TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON messages (conversation_id, sent_at ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS templates (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  sort_order INT NOT NULL DEFAULT 0
);
