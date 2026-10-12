ALTER TABLE sessions ADD COLUMN IF NOT EXISTS game_server_id UUID;
CREATE TABLE IF NOT EXISTS game_servers(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  adapter TEXT NOT NULL CHECK(adapter IN ('mock','project_reboot')),
  region TEXT NOT NULL CHECK(region IN ('EU','NA','AS')),
  base_url TEXT,
  public_host TEXT,
  public_port INT,
  supported_versions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'registered',
  last_health JSONB,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS player_sessions(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'allocated',
  diagnostics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id,user_id)
);
