import { useEffect } from "react";
import type { FamilyManifest } from "@salvage-rights/shared";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AppRoutes } from "./routes";
import { SettingsProvider, useSettings } from "./settings-context";

function Frame({ families }: { families: FamilyManifest[] }) {
  const { settings } = useSettings();

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    if (settings.theme !== "device") document.body.classList.add(settings.theme);
  }, [settings.theme]);

  return (
    <div className="sr-frame">
      <Header />
      <div className="sr-content">
        <AppRoutes families={families} />
      </div>
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
