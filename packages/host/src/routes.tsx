import { Route, Routes } from "react-router";
import type { FamilyManifest } from "@salvage-rights/shared";
import { About } from "./pages/About";
import { FamilyRoutePage } from "./pages/FamilyRoutePage";
import { NotFound } from "./pages/NotFound";

// The landing page (Task 7) and the Settings page (Task 8) replace these two.
function Landing() {
  return (
    <main className="sr-page">
      <h1>Salvage Rights</h1>
    </main>
  );
}

function SettingsPage() {
  return (
    <main className="sr-page">
      <h1>Settings</h1>
    </main>
  );
}

export function AppRoutes({ families }: { families: FamilyManifest[] }) {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About families={families} />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/:family/*" element={<FamilyRoutePage families={families} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
