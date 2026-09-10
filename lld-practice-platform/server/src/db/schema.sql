CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- serialized Problem JSON
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  format TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES attempts(id)
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL, -- serialized EvaluationResult JSON
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);
