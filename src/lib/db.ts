import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "teacher-dashboard.db");

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS rosters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roster_id INTEGER NOT NULL REFERENCES rosters(id),
    name TEXT NOT NULL,
    external_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_students_roster ON students(roster_id);

  CREATE TABLE IF NOT EXISTS test_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES test_groups(id),
    sequence INTEGER NOT NULL,
    name TEXT NOT NULL,
    administered_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tests_group ON tests(group_id);

  CREATE TABLE IF NOT EXISTS performance_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    min_score INTEGER NOT NULL,
    max_score INTEGER,
    color TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reporting_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS standards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rc_id INTEGER NOT NULL REFERENCES reporting_categories(id),
    domain TEXT NOT NULL,
    sub_domain TEXT,
    code TEXT NOT NULL,
    description TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_standards_rc ON standards(rc_id);

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    test_id INTEGER NOT NULL REFERENCES tests(id),
    overall_score INTEGER NOT NULL,
    level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
    rc_scores TEXT NOT NULL DEFAULT '{}',
    std_scores TEXT NOT NULL DEFAULT '{}',
    UNIQUE(student_id, test_id)
  );
  CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
  CREATE INDEX IF NOT EXISTS idx_scores_test ON scores(test_id);
  CREATE INDEX IF NOT EXISTS idx_scores_level ON scores(test_id, level);

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('ixl', 'lexiacore5', 'reflex', 'khan_academy')),
    group_id INTEGER NOT NULL REFERENCES test_groups(id),
    rc_id INTEGER REFERENCES reporting_categories(id),
    created_after_test_id INTEGER NOT NULL REFERENCES tests(id),
    impacted_test_id INTEGER REFERENCES tests(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assignment_standards (
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    standard_id INTEGER NOT NULL REFERENCES standards(id),
    PRIMARY KEY (assignment_id, standard_id)
  );

  CREATE TABLE IF NOT EXISTS assignment_students (
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'started', 'completed')),
    started_at TEXT,
    completed_at TEXT,
    PRIMARY KEY (assignment_id, student_id)
  );
  CREATE INDEX IF NOT EXISTS idx_as_status ON assignment_students(assignment_id, status);
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
