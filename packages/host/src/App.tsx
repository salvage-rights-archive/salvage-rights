import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import type { FamilyManifest } from "@salvage-rights/shared";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AppRoutes } from "./routes";
import { SettingsProvider, useSettings } from "./settings-context";

const SITE_NAME = "Salvage Rights";

function Frame({ families }: { families: FamilyManifest[] }) {
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
      <Header />
      <main ref={main} className="sr-content">
        <AppRoutes families={families} />
      </main>
      <Footer />
    </div>
  );
}

/** The app frame. The caller supplies the router, so tests can use a memory router. */
export function App({ families }: { families: FamilyManifest[] }) {
  return (
    <SettingsProvider>
      <Frame families={families} />
    </SettingsProvider>
  );
}
