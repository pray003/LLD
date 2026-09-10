import { db } from "../db/index.js";
import { Problem } from "../domain/types.js";

/**
 * Repository interface: the rest of the app depends on this, not on SQLite.
 * Swapping storage (Postgres, in-memory for tests) means writing one new
 * class, not touching routes or evaluators.
 */
export interface IProblemRepository {
  getAll(): Problem[];
  getById(id: string): Problem | null;
  upsert(problem: Problem): void;
}

export class SqliteProblemRepository implements IProblemRepository {
  getAll(): Problem[] {
    const rows = db.prepare("SELECT data FROM problems ORDER BY created_at ASC").all() as { data: string }[];
    return rows.map((r) => JSON.parse(r.data));
  }

  getById(id: string): Problem | null {
    const row = db.prepare("SELECT data FROM problems WHERE id = ?").get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  upsert(problem: Problem): void {
    db.prepare(
      `INSERT INTO problems (id, data, created_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`
    ).run(problem.id, JSON.stringify(problem), problem.createdAt);
  }
}
