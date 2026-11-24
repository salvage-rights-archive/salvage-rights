import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface State {
  failed: boolean;
}

/** The last line of defence: catches what the frame, the header or the settings provider throw. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="sr-content">
        <div className="sr-page">
          <h1>Something went wrong</h1>
          <p>
            <button
              type="button"
              className="sr-action"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload the page
            </button>
          </p>
        </div>
      </main>
    );
  }
}
