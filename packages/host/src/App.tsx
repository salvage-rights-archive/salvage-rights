import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import type { FamilyManifest } from "@salvage-rights/shared";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { PwaBar } from "./components/PwaBar";
import { AppRoutes } from "./routes";
import { SettingsProvider, useSettings } from "./settings-context";

const SITE_NAME = "Salvage Rights";

/** Puts focus on the page's heading, or on the page itself while it has none yet. */
function focusHeading(container: HTMLElement | null) {
  const target = container?.querySelector("h1") ?? container;
  if (!target) return;
  target.tabIndex = -1;
  target.focus();
}

function Frame({ families, editionId }: { families: FamilyManifest[]; editionId: string }) {
  const { settings } = useSettings();
  const { pathname, key } = useLocation();
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    if (settings.theme !== "device") document.body.classList.add(settings.theme);
  }, [settings.theme]);

  // On every route change the document title follows the page heading and focus moves to it. Lazy pages
  // arrive later, so wait for the heading to appear. The first page shown does not take focus.
  useEffect(() => {
    const container = main.current;
    if (!container) return;
    const moveFocus = key !== "default";
    const announce = () => {
      const heading = container.querySelector("h1");
      if (!heading) return false;
      document.title = `${heading.textContent ?? ""} · ${SITE_NAME}`;
      if (moveFocus) {
        heading.tabIndex = -1;
        heading.focus();
      }
      return true;
    };
    if (announce()) return;
    const observer = new MutationObserver(() => {
      if (announce()) observer.disconnect();
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [pathname, key]);

  return (
    <div className="sr-frame">
      {/* First in the tab order: past the header to the page. The heading takes focus, as it does on a route change. */}
      <a
        className="sr-skip"
        href="#sr-content"
        onClick={(event) => {
          event.preventDefault();
          focusHeading(main.current);
        }}
      >
        Skip to content
      </a>
      <Header />
      <PwaBar />
      <main ref={main} id="sr-content" className="sr-content">
        <AppRoutes families={families} editionId={editionId} />
      </main>
      <Footer />
    </div>
  );
}

/** The app frame. The caller supplies the router, so tests can use a memory router. */
export function App({ families, editionId }: { families: FamilyManifest[]; editionId: string }) {
  return (
    <AppErrorBoundary>
      <SettingsProvider>
        <Frame families={families} editionId={editionId} />
      </SettingsProvider>
    </AppErrorBoundary>
  );
}
