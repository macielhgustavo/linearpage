CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL CHECK (stage IN ('novo','qualificado','proposta','negociacao','ganho','perdido')),
  valueCents INTEGER NOT NULL CHECK (valueCents >= 0),
  source TEXT NOT NULL DEFAULT '',
  nextAction TEXT NOT NULL DEFAULT '',
  nextContact TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX leads_followup ON leads(stage, nextContact);
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX activities_lead ON activities(leadId, createdAt);
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  recordId TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
