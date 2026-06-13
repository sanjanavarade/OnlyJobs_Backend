-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types (idempotent — safe to re-run on existing DB)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('job_seeker', 'recruiter', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE app_status AS ENUM ('applied', 'shortlisted', 'rejected', 'interview', 'hired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE interview_status AS ENUM ('scheduled', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE job_type AS ENUM ('full_time', 'part_time', 'contract', 'internship'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job seeker extended profile
CREATE TABLE IF NOT EXISTS job_seekers (
  seeker_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  phone      TEXT,
  skills     TEXT[],
  education  TEXT,
  resume_url TEXT,
  UNIQUE (user_id)
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  company_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  website      TEXT,
  description  TEXT,
  verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recruiters extended profile
CREATE TABLE IF NOT EXISTS recruiters (
  recruiter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  company_id   UUID REFERENCES companies(company_id) ON DELETE SET NULL,
  verified     BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id)
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  job_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  posted_by   UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  salary      TEXT,
  location    TEXT,
  job_type    job_type NOT NULL DEFAULT 'full_time',
  skills      TEXT[],
  approved    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
  seeker_id      UUID NOT NULL REFERENCES job_seekers(seeker_id) ON DELETE CASCADE,
  status         app_status NOT NULL DEFAULT 'applied',
  cover_note     TEXT,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, seeker_id)
);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
  interview_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  interview_date TIMESTAMPTZ NOT NULL,
  meeting_link   TEXT,
  status         interview_status NOT NULL DEFAULT 'scheduled',
  notes          TEXT
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blockchain hiring records
CREATE TABLE IF NOT EXISTS blockchain_records (
  record_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  hash_value     TEXT NOT NULL,
  ring_signature TEXT,
  tx_hash        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_jobs_company    ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_approved   ON jobs(approved);
CREATE INDEX IF NOT EXISTS idx_apps_job        ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_seeker     ON applications(seeker_id);
CREATE INDEX IF NOT EXISTS idx_apps_status     ON applications(status);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread    ON notifications(user_id) WHERE is_read = FALSE;
