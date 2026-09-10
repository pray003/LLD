import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { AttemptWithSubmissions, Problem, SubmissionFormat, SubmissionWithEvaluation } from "../types";
import { FeedbackPanel } from "../components/FeedbackPanel";

const FORMATS: { id: SubmissionFormat; label: string; placeholder: string }[] = [
  {
    id: "text",
    label: "Text / pseudocode",
    placeholder: "Describe your classes, responsibilities, and relationships in your own words…",
  },
  {
    id: "code",
    label: "Code",
    placeholder: "class ParkingSpot {\n  // ...\n}\n\ninterface PricingStrategy {\n  // ...\n}",
  },
  {
    id: "diagram",
    label: "Diagram (JSON)",
    placeholder:
      '{\n  "classes": [{ "name": "ParkingSpot", "methods": ["isOccupied"] }],\n  "edges": [{ "from": "ParkingLot", "to": "ParkingSpot", "type": "contains" }]\n}',
  },
];

export function AttemptPage(_props: { learnerId: string }) {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<AttemptWithSubmissions | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [format, setFormat] = useState<SubmissionFormat>("text");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<SubmissionWithEvaluation | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    api
      .getAttempt(attemptId)
      .then((a) => {
        setAttempt(a);
        const last = a.submissions[a.submissions.length - 1] ?? null;
        setLatestSubmission(last);
        return api.getProblem(a.problemId);
      })
      .then(setProblem)
      .catch((err) => setError(err.message));
  }, [attemptId]);

  // Poll while the latest submission's evaluation is still in progress.
  useEffect(() => {
    if (!latestSubmission || latestSubmission.evaluation?.status !== "evaluating") {
      if (pollRef.current) window.clearInterval(pollRef.current);
      return;
    }
    pollRef.current = window.setInterval(async () => {
      const result = await api.getSubmission(latestSubmission.id);
      setLatestSubmission({ ...result.submission, evaluation: result.evaluation });
    }, 1500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [latestSubmission]);

  async function handleSubmit() {
    if (!attemptId || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.submit(attemptId, format, content);
      setLatestSubmission({ ...result.submission, evaluation: result.evaluation });
      const refreshed = await api.getAttempt(attemptId);
      setAttempt(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    if (!latestSubmission) return;
    setRetrying(true);
    try {
      const result = await api.retryEvaluation(latestSubmission.id);
      setLatestSubmission({ ...result.submission, evaluation: result.evaluation });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRetrying(false);
    }
  }

  if (error) return <p className="empty-state">{error}</p>;
  if (!attempt || !problem) return <p className="empty-state">Loading attempt…</p>;

  const activeFormat = FORMATS.find((f) => f.id === format)!;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/">Problems</Link> / {problem.title}
      </p>

      <div className="attempt-layout">
        <div className="panel">
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>{problem.title}</h2>
          <p className="problem-statement">{problem.statement}</p>

          <h3 style={{ fontSize: 14, marginTop: 16, color: "var(--ink-soft)" }}>Functional requirements</h3>
          <ul className="req-list">
            {problem.functionalRequirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          <h3 style={{ fontSize: 14, marginTop: 16, color: "var(--ink-soft)" }}>Non-functional requirements</h3>
          <ul className="req-list">
            {problem.nonFunctionalRequirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="panel">
            <div className="format-tabs">
              {FORMATS.map((f) => (
                <button key={f.id} className={format === f.id ? "active" : ""} onClick={() => setFormat(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <textarea
              className="editor"
              placeholder={activeFormat.placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div>
              <button className="primary-button" onClick={handleSubmit} disabled={submitting || !content.trim()}>
                {submitting ? "Submitting…" : "Submit for feedback"}
              </button>
            </div>
          </div>

          {latestSubmission?.evaluation && (
            <FeedbackPanel evaluation={latestSubmission.evaluation} onRetry={handleRetry} retrying={retrying} />
          )}
        </div>
      </div>

      {attempt.submissions.length > 1 && (
        <div className="panel" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, color: "var(--ink-soft)" }}>
            Earlier submissions on this attempt ({attempt.submissions.length - 1})
          </h3>
          {attempt.submissions.slice(0, -1).map((s) => (
            <div key={s.id} className="finding-row">
              <span className={`status-pill ${s.evaluation?.status ?? s.status}`}>
                {s.evaluation?.overallScore ?? "—"}
              </span>
              <span>{s.format} · {new Date(s.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
