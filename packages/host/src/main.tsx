import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { families } from "virtual:families";
import { App } from "./App";
import "./styles/tokens.scss";
import "./styles/shell.scss";

// public/404.html leaves the address the visitor asked for here before sending them to the base path.
const REDIRECT_KEY = "sr-redirect";
try {
  const wanted = sessionStorage.getItem(REDIRECT_KEY);
  if (wanted !== null) {
    sessionStorage.removeItem(REDIRECT_KEY);
    history.replaceState(null, "", wanted);
  }
} catch {
  // Session storage is unavailable: the visitor lands on the start page.
}

const container = document.getElementById("root");
if (!container) throw new Error("index.html has no #root");

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App families={families} />
    </BrowserRouter>
  </StrictMode>,
);
