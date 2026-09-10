import { db } from "../db/index.js";
import { EvaluationResult } from "../domain/types.js";

export interface IEvaluationRepository {
  upsert(result: EvaluationResult): void;
  getBySubmission(submissionId: string): EvaluationResult | null;
}

export class SqliteEvaluationRepository implements IEvaluationRepository {
  upsert(result: EvaluationResult): void {
    db.prepare(
      `INSERT INTO evaluations (id, submission_id, data, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(submission_id) DO UPDATE SET data = excluded.data`
    ).run(result.id, result.submissionId, JSON.stringify(result), result.createdAt);
  }

  getBySubmission(submissionId: string): EvaluationResult | null {
    const row = db.prepare("SELECT data FROM evaluations WHERE submission_id = ?").get(submissionId) as
      | { data: string }
      | undefined;
    return row ? JSON.parse(row.data) : null;
  }
}
