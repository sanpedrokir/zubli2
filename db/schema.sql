-- Zubli Reconnect database schema (Neon PostgreSQL)
-- Idempotent: safe to run more than once (`npm run db:migrate`).
-- Statements are separated by semicolons at line end; avoid $$ function bodies
-- so the migration runner can split statements safely.

-- gen_random_uuid() and md5() are built into PostgreSQL 13+ (Neon runs 15+); no extensions needed.

-- ---------------------------------------------------------------------------
-- Users: one row per Clerk user. Created lazily on first authenticated request.
-- Contact details (email, phone) are NOT stored here; Clerk holds them and the
-- app never sends them to other users.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,               -- Clerk user id
  display_name    TEXT NOT NULL DEFAULT '',       -- name shown to people you choose to connect with
  onboarded_at    TIMESTAMPTZ,
  is_suspended    BOOLEAN NOT NULL DEFAULT FALSE, -- set automatically after repeated reports
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Memories: "Find a Lost Friend" searches. Private to the owner.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memories (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description        TEXT NOT NULL,                -- the only required field
  full_name          TEXT,
  partial_name       TEXT,
  nickname           TEXT,
  country            TEXT,
  city               TEXT,
  neighbourhood      TEXT,
  hangouts           TEXT,
  school             TEXT,
  workplace          TEXT,
  occupation         TEXT,
  year_last_seen     SMALLINT CHECK (year_last_seen IS NULL OR year_last_seen BETWEEN 1900 AND 2100),
  age_that_year      SMALLINT CHECK (age_that_year IS NULL OR age_that_year BETWEEN 0 AND 120),
  gender             TEXT,
  height             TEXT,
  shared_activities  TEXT,
  personal_memories  TEXT,
  matches_refreshed_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memories_owner_idx ON memories (owner_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Historical profile: optional, discoverable only when the user opts in.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  user_id                    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  discoverable               BOOLEAN NOT NULL DEFAULT FALSE,  -- master opt-in for matching
  show_name_in_suggestions   BOOLEAN NOT NULL DEFAULT FALSE,  -- otherwise shown as "A Zubli member"
  birth_year                 SMALLINT CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  birth_year_in_matching     BOOLEAN NOT NULL DEFAULT TRUE,
  gender                     TEXT,
  about                      TEXT,                            -- never shown in suggestions
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_discoverable_idx ON profiles (user_id) WHERE discoverable;

-- Each historical fact is its own row so it can be opted in/out of matching.
CREATE TABLE IF NOT EXISTS profile_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind                 TEXT NOT NULL CHECK (kind IN ('school', 'location', 'workplace', 'nickname', 'former_name')),
  value                TEXT NOT NULL,         -- school / workplace / nickname / name / place label
  city                 TEXT,
  country              TEXT,
  neighbourhood        TEXT,
  start_year           SMALLINT CHECK (start_year IS NULL OR start_year BETWEEN 1900 AND 2100),
  end_year             SMALLINT CHECK (end_year IS NULL OR end_year BETWEEN 1900 AND 2100),
  include_in_matching  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_entries_user_idx ON profile_entries (user_id, kind);
CREATE INDEX IF NOT EXISTS profile_entries_matching_idx ON profile_entries (kind, lower(value)) WHERE include_in_matching;

-- ---------------------------------------------------------------------------
-- Cached match suggestions per memory (recomputed on demand).
-- Reasons are phrased in terms of the searcher's own clues.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_suggestions (
  ref                UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE, -- opaque id sent to the browser (user ids never are)
  memory_id          UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  candidate_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score              SMALLINT NOT NULL,
  reasons            JSONB NOT NULL DEFAULT '[]'::jsonb,
  dismissed          BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (memory_id, candidate_user_id)
);
CREATE INDEX IF NOT EXISTS match_suggestions_candidate_idx ON match_suggestions (candidate_user_id);

-- ---------------------------------------------------------------------------
-- Reconnection requests ("introductions") and, once accepted, messages.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connection_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_id     UUID REFERENCES memories(id) ON DELETE SET NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS connection_requests_recipient_idx ON connection_requests (recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS connection_requests_sender_idx ON connection_requests (sender_id, status, created_at DESC);
-- Only one open (pending/accepted) request between the same two people in a given direction.
CREATE UNIQUE INDEX IF NOT EXISTS connection_requests_open_pair_idx
  ON connection_requests (sender_id, recipient_id) WHERE status IN ('pending', 'accepted');

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
  sender_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_request_idx ON messages (request_id, created_at);

-- ---------------------------------------------------------------------------
-- Safety: blocks and reports.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks (blocked_id);

CREATE TABLE IF NOT EXISTS reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id        UUID REFERENCES connection_requests(id) ON DELETE SET NULL,
  reason            TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'impersonation', 'inappropriate', 'safety', 'other')),
  details           TEXT,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_reported_idx ON reports (reported_user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS reports_one_open_per_pair_idx
  ON reports (reporter_id, reported_user_id) WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- In-app notifications.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('request_received', 'request_accepted', 'message_received')),
  request_id  UUID REFERENCES connection_requests(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- Memory-inspired illustrations (AI-generated, never used for identity matching).
-- Images are stored privately and served only to their owner.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS illustrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_id   UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  era         TEXT NOT NULL,
  style       TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  image       BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS illustrations_memory_idx ON illustrations (memory_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Rate limiting: fixed-window counters shared across serverless instances.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);
