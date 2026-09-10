import { db } from "../db/index.js";
import { Submission, SubmissionStatus } from "../domain/types.js";

export interface ISubmissionRepository {
  create(submission: Submission): void;
  getById(id: string): Submission | null;
  getByAttempt(attemptId: string): Submission[];
  updateStatus(id: string, status: SubmissionStatus): void;
}

interface SubmissionRow {
  id: string;
  attempt_id: string;
  format: string;
  content: string;
  status: string;
  created_at: string;
}

function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    format: row.format as Submission["format"],
    content: row.content,
    status: row.status as SubmissionStatus,
    createdAt: row.created_at,
  };
}

export class SqliteSubmissionRepository implements ISubmissionRepository {
  create(submission: Submission): void {
    db.prepare(
      `INSERT INTO submissions (id, attempt_id, format, content, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      submission.id,
      submission.attemptId,
      submission.format,
      submission.content,
      submission.status,
      submission.createdAt
    );
  }

  getById(id: string): Submission | null {
    const row = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as SubmissionRow | undefined;
    return row ? rowToSubmission(row) : null;
  }

  getByAttempt(attemptId: string): Submission[] {
    const rows = db
      .prepare("SELECT * FROM submissions WHERE attempt_id = ? ORDER BY created_at ASC")
      .all(attemptId) as SubmissionRow[];
    return rows.map(rowToSubmission);
  }

  updateStatus(id: string, status: SubmissionStatus): void {
    db.prepare("UPDATE submissions SET status = ? WHERE id = ?").run(status, id);
  }
}
