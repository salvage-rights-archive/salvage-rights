// A saved aerospace unit that the editor cannot show must never blank the page or trap the player behind it: the page says which record it
// is, offers a copy of what is stored, and a way back. (The 'Mech editor has its own, which speaks of 'Mechs and reads the Classic store.)
import { Component, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Link } from "react-router";
import { downloadJson } from "../storage";
import { AERO_HOME } from "./routes";
import { openAeroStorage } from "./storage";

function Failure({ id, message }: { id: string; message: string }) {
  const [status, setStatus] = useState("");
  const exportRaw = async () => {
    try {
      const stored = await (await openAeroStorage()).raw(id);
      downloadJson(`${id.replace(/[^A-Za-z0-9-]+/g, "-") || "unit"}.raw.json`, stored ?? null);
      setStatus("Export started.");
    } catch {
      setStatus("We could not read that record to export it.");
    }
  };
  return (
    <div className="sr-page">
      <h1>This unit could not be shown</h1>
      <p>Something in the saved unit stopped this page from drawing. Nothing has been changed or lost. You can keep a copy of exactly what is saved.</p>
      <p>
        Record id: <code>{id || "(none)"}</code>
      </p>
      <p className="bt-hint">{message}</p>
      <p className="bt-actions">
        <button
          type="button"
          className="bt-button"
          onClick={() => {
            void exportRaw();
          }}
        >
          Export raw record
        </button>
        <Link className="bt-button bt-button--secondary" to={AERO_HOME}>
          Back to AeroTech
        </Link>
      </p>
      <p role="status">{status}</p>
    </div>
  );
}

export default class AeroBoundary extends Component<{ id: string; children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    return this.state.error ? <Failure id={this.props.id} message={this.state.error.message} /> : this.props.children;
  }
}
