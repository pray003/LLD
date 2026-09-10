import { useState } from "react";

const STORAGE_KEY = "lld-practice.learnerId";

function randomLearnerId(): string {
  return `learner-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The assignment scopes out a full auth/LMS system, but attempt history
 * still needs to be tied to *someone*. A persisted local learner id is the
 * simplest thing that satisfies "the learner can see previous attempts"
 * without building accounts. Swapping this for real auth later only means
 * replacing this hook's implementation — nothing downstream depends on how
 * learnerId is produced.
 */
export function useLearnerId(): [string, (id: string) => void] {
  const [learnerId, setLearnerIdState] = useState<string>(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const generated = randomLearnerId();
    localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  });

  const setLearnerId = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setLearnerIdState(trimmed);
  };

  return [learnerId, setLearnerId];
}
