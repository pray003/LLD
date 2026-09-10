import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AttemptWithSubmissions } from "../types";

export function HistoryPage({ learnerId }: { learnerId: string }) {
  const [attempts, setAttempts] = useState<AttemptWithSubmissions[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAttempts(learnerId)
      .then(setAttempts)
      .catch((err) => setError(err.message));
  }, [learnerId]);

  if (error) return <p className="empty-state">Couldn't load history: {error}</p>;
  if (!attempts) return <p className="empty-state">Loading history…</p>;

  if (attempts.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 10 }}>Your attempts</h1>
        <p className="empty-state">
          No attempts yet for learner id <code>{learnerId}</code>. <Link to="/">Pick a problem</Link> to get
          started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Your attempts</h1>
      <p className="problem-statement" style={{ marginBottom: 20 }}>
        Every attempt keeps its submission history, so you can see whether a second try improved on the first.
      </p>
      {attempts.map((a) => {
        const latest = a.submissions[a.submissions.length - 1];
        return (
          <Link key={a.id} to={`/attempts/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="history-item">
              <div className="history-item-top">
                <strong>{a.problemTitle}</strong>
                {latest?.evaluation?.overallScore != null && (
                  <span className="score-badge" style={{ fontSize: 18 }}>
                    {latest.evaluation.overallScore}
                  </span>
                )}
              </div>
              <div className="history-meta">
                {a.submissions.length} submission{a.submissions.length === 1 ? "" : "s"} · started{" "}
                {new Date(a.createdAt).toLocaleDateString()} ·{" "}
                <span className={`status-pill ${latest?.evaluation?.status ?? a.status}`}>
                  {latest?.evaluation?.status ?? a.status}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
