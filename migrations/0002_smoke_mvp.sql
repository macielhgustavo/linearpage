CREATE TABLE smoke_events (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  name TEXT NOT NULL CHECK (name IN ('landing_view','scroll_50','demo_view','how_it_works_view','cta_click','form_start','form_submit','form_error')),
  path TEXT NOT NULL DEFAULT '/',
  source TEXT NOT NULL DEFAULT '',
  utmSource TEXT NOT NULL DEFAULT '',
  utmMedium TEXT NOT NULL DEFAULT '',
  utmCampaign TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL
);
CREATE INDEX smoke_events_name_created ON smoke_events(name, createdAt);
CREATE INDEX smoke_events_session ON smoke_events(sessionId, createdAt);
