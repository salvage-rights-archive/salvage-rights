import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { editionId, families } from "virtual:families";
import { App } from "./App";
import { restoredPath } from "./restore-path";
import { startupProblems } from "./startup";
import "./styles/tokens.scss";
import "./styles/shell.scss";
import "./styles/landing.scss";

// public/404.html leaves the address the visitor asked for here before sending them to the base path.
const REDIRECT_KEY = "sr-redirect";
try {
  const stored = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  const wanted = restoredPath(stored, import.meta.env.BASE_URL);
  if (wanted !== null) history.replaceState(null, "", wanted);
} catch {
  // Session storage is unavailable: the visitor lands on the start page.
}

const container = document.getElementById("root");
if (!container) throw new Error("index.html has no #root");

const problems = startupProblems(families);
if (problems.length > 0) {
  console.error("This build has a problem:", problems);
  createRoot(container).render(
    <main className="sr-content">
      <div className="sr-page">
        <h1>This build has a problem</h1>
        <ul>
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </main>,
  );
} else {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App families={families} editionId={editionId} />
      </BrowserRouter>
    </StrictMode>,
  );
}
