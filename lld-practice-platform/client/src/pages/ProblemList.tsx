import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { ProblemSummary } from "../types";

export function ProblemList({ learnerId }: { learnerId: string }) {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listProblems()
      .then(setProblems)
      .catch((err) => setError(err.message));
  }, []);

  async function start(problemId: string) {
    setStartingId(problemId);
    try {
      const attempt = await api.createAttempt(problemId, learnerId);
      navigate(`/attempts/${attempt.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStartingId(null);
    }
  }

  if (error) return <p className="empty-state">Couldn't load problems: {error}</p>;
  if (!problems) return <p className="empty-state">Loading problems…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Choose a problem</h1>
      <p className="problem-statement" style={{ marginBottom: 24 }}>
        Pick one, design a solution, submit it, and get feedback on the responsibilities, abstractions, and
        trade-offs in your design.
      </p>
      {problems.map((p) => (
        <div key={p.id} className="problem-row" onClick={() => start(p.id)} role="button">
          <div className="problem-row-top">
            <h3>{p.title}</h3>
            <span className="difficulty">{p.difficulty}</span>
          </div>
          <p className="problem-statement">{p.statement}</p>
          <div className="tag-row">
            {p.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
          {startingId === p.id && <p className="muted-note">Starting attempt…</p>}
        </div>
      ))}
    </div>
  );
}
