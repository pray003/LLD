import { db } from "../db/index.js";
import { Attempt } from "../domain/types.js";

export interface IAttemptRepository {
  create(attempt: Attempt): void;
  getById(id: string): Attempt | null;
  getByLearner(learnerId: string): Attempt[];
  updateStatus(id: string, status: Attempt["status"]): void;
}

interface AttemptRow {
  id: string;
  problem_id: string;
  learner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    problemId: row.problem_id,
    learnerId: row.learner_id,
    status: row.status as Attempt["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteAttemptRepository implements IAttemptRepository {
  create(attempt: Attempt): void {
    db.prepare(
      `INSERT INTO attempts (id, problem_id, learner_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(attempt.id, attempt.problemId, attempt.learnerId, attempt.status, attempt.createdAt, attempt.updatedAt);
  }

  getById(id: string): Attempt | null {
    const row = db.prepare("SELECT * FROM attempts WHERE id = ?").get(id) as AttemptRow | undefined;
    return row ? rowToAttempt(row) : null;
  }

  getByLearner(learnerId: string): Attempt[] {
    const rows = db
      .prepare("SELECT * FROM attempts WHERE learner_id = ? ORDER BY created_at DESC")
      .all(learnerId) as AttemptRow[];
    return rows.map(rowToAttempt);
  }

  updateStatus(id: string, status: Attempt["status"]): void {
    db.prepare("UPDATE attempts SET status = ?, updated_at = ? WHERE id = ?").run(
      status,
      new Date().toISOString(),
      id
    );
  }
}
