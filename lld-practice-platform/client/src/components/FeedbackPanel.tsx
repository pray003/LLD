import type { EvaluationResult } from "../types";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  evaluating: "Evaluating…",
  evaluated: "Evaluated",
  evaluated_partial: "Evaluated (AI feedback unavailable)",
  evaluation_failed: "Evaluation failed",
};

export function FeedbackPanel({
  evaluation,
  onRetry,
  retrying,
}: {
  evaluation: EvaluationResult;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ fontSize: 18 }}>Feedback</h2>
        <span className={`status-pill ${evaluation.status}`}>{STATUS_LABEL[evaluation.status]}</span>
      </div>

      {evaluation.overallScore !== null && (
        <div style={{ margin: "14px 0" }}>
          <span className="score-badge">{evaluation.overallScore}</span>
          <span style={{ color: "var(--ink-soft)", fontSize: 13 }}> / 100</span>
        </div>
      )}

      {evaluation.dimensionScores.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {evaluation.dimensionScores.map((d) => (
            <div key={d.criterionId} className="dimension-row">
              <span>{d.criterionId}</span>
              <div className="dimension-bar-track">
                <div className="dimension-bar-fill" style={{ width: `${Math.round(d.score * 100)}%` }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{Math.round(d.score * 100)}</span>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 14, marginTop: 18, marginBottom: 6, color: "var(--ink-soft)" }}>
        Required elements checked automatically
      </h3>
      <div>
        {evaluation.deterministicFindings.map((f) => (
          <div key={f.criterionId} className="finding-row">
            <span className={`finding-mark ${f.passed ? "pass" : "fail"}`}>{f.passed ? "✓" : "!"}</span>
            <span>{f.message}</span>
          </div>
        ))}
      </div>

      {evaluation.strengths.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginTop: 18, marginBottom: 6, color: "var(--ink-soft)" }}>Strengths</h3>
          <ul className="req-list">
            {evaluation.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}

      {evaluation.improvements.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginTop: 18, marginBottom: 6, color: "var(--ink-soft)" }}>
            Where to improve
          </h3>
          <ul className="req-list">
            {evaluation.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}

      {evaluation.status === "evaluated_partial" && (
        <div className="muted-note">
          The automatic checks above completed, but AI-based feedback on design quality didn't complete
          ({evaluation.llmError}).{" "}
          <button className="secondary-button" onClick={onRetry} disabled={retrying} style={{ marginLeft: 6 }}>
            {retrying ? "Retrying…" : "Retry AI feedback"}
          </button>
        </div>
      )}

      {evaluation.status === "evaluating" && (
        <p className="muted-note">AI feedback on design quality is being generated — this can take a few seconds.</p>
      )}
    </div>
  );
}
