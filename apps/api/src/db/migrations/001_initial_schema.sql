-- Cybertron Database Schema
-- Phase 1: Foundation (SQLite version)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'builder',
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  country TEXT,
  contact_info TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Parts table
CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  external_id TEXT,
  supplier_id TEXT REFERENCES suppliers(id),
  part_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  spec_data TEXT DEFAULT '{}',
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- Project collaborators
CREATE TABLE IF NOT EXISTS project_users (
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  permission_level TEXT DEFAULT 'viewer',
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, user_id)
);

-- Bill of Materials
CREATE TABLE IF NOT EXISTS bom_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  part_id TEXT NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  reference_designator TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_bom_project ON bom_entries(project_id);

-- Design files
CREATE TABLE IF NOT EXISTS design_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_design_files_project ON design_files(project_id);

-- Diagnostics/Simulation results
CREATE TABLE IF NOT EXISTS diagnostics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  type TEXT NOT NULL,
  inputs TEXT DEFAULT '{}',
  results TEXT DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  run_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_project ON diagnostics(project_id);

-- Chat/Agent session logs
CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_session_logs_user ON session_logs(user_id);
