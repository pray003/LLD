import { NavLink, Route, BrowserRouter, Routes } from "react-router-dom";
import { useLearnerId } from "./useLearnerId";
import { ProblemList } from "./pages/ProblemList";
import { AttemptPage } from "./pages/AttemptPage";
import { HistoryPage } from "./pages/HistoryPage";

function Header({ learnerId, setLearnerId }: { learnerId: string; setLearnerId: (id: string) => void }) {
  return (
    <header className="app-header">
      <div>
        <div className="wordmark">LLD Practice by Prayanshu</div>
      </div>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Problems
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
          History
        </NavLink>
        <input
          className="learner-input"
          value={learnerId}
          onChange={(e) => setLearnerId(e.target.value)}
          title="Your learner id — attempts are tied to this. Change it to switch identity."
        />
      </nav>
    </header>
  );
}

export default function App() {
  const [learnerId, setLearnerId] = useLearnerId();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header learnerId={learnerId} setLearnerId={setLearnerId} />
        <Routes>
          <Route path="/" element={<ProblemList learnerId={learnerId} />} />
          <Route path="/attempts/:attemptId" element={<AttemptPage learnerId={learnerId} />} />
          <Route path="/history" element={<HistoryPage learnerId={learnerId} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
