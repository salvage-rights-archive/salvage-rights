import { useState } from "react";
import type { ChangeEvent } from "react";
import { openableFamilies } from "@salvage-rights/shared";
import type { FamilyManifest, Settings, Theme } from "@salvage-rights/shared";
import { useSettings } from "../settings-context";

const THEMES: { value: Theme; label: string }[] = [
  { value: "device", label: "Follow this device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function without(ids: string[], id: string): string[] {
  return ids.filter((item) => item !== id);
}

function toggled(ids: string[], id: string, hidden: boolean): string[] {
  return hidden ? [...without(ids, id), id] : without(ids, id);
}

export function SettingsPage({ families }: { families: FamilyManifest[] }) {
  const { settings, update, persistent, saveFailed, loaded, exportSettings, importSettings } = useSettings();
  const [problems, setProblems] = useState<string[]>([]);
  const [imported, setImported] = useState(false);
  const openable = openableFamilies(families);

  const change = (patch: Partial<Settings>) => {
    update({ ...settings, ...patch });
  };

  const download = async () => {
    const file = await exportSettings();
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "salvage-rights-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    setImported(false);
    let found: string[];
    try {
      found = await importSettings(JSON.parse(await chosen.text()));
    } catch {
      found = ["That file is not a Salvage Rights settings file."];
    }
    setProblems(found);
    setImported(found.length === 0);
    input.value = "";
  };

  return (
    <div className="sr-page sr-settings">
      <h1>Settings</h1>
      {loaded && (
        <>
          {!persistent && (
            <p className="sr-settings__warning">
              This browser is not letting us save. Your choices last until you close this tab.
            </p>
          )}
          {persistent && saveFailed && (
            <p className="sr-settings__warning">We could not save that change. It will last until you close this tab.</p>
          )}

          <fieldset className="sr-settings__group">
            <legend>Theme</legend>
            {THEMES.map((theme) => (
              <label key={theme.value} className="sr-settings__choice">
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === theme.value}
                  onChange={() => {
                    change({ theme: theme.value });
                  }}
                />
                {theme.label}
              </label>
            ))}
          </fieldset>

          {openable.length === 0 ? (
            <p>There are no games to choose from yet.</p>
          ) : (
            <fieldset className="sr-settings__group">
              <legend>Show these games</legend>
              {openable.map((family) => {
                const familyHidden = settings.hiddenFamilies.includes(family.id);
                const readyGames = family.games.filter((game) => game.ready);
                return (
                  <div key={family.id} className="sr-settings__family">
                    <label className="sr-settings__choice">
                      <input
                        type="checkbox"
                        checked={!familyHidden}
                        onChange={(event) => {
                          change({ hiddenFamilies: toggled(settings.hiddenFamilies, family.id, !event.target.checked) });
                        }}
                      />
                      {family.name}
                    </label>
                    {readyGames.length > 1 &&
                      readyGames.map((game) => {
                        const id = `${family.id}/${game.id}`;
                        return (
                          <label key={id} className="sr-settings__choice sr-settings__choice--game">
                            <input
                              type="checkbox"
                              disabled={familyHidden}
                              checked={!familyHidden && !settings.hiddenGames.includes(id)}
                              onChange={(event) => {
                                change({ hiddenGames: toggled(settings.hiddenGames, id, !event.target.checked) });
                              }}
                            />
                            {game.shortName}
                          </label>
                        );
                      })}
                  </div>
                );
              })}
              <p className="sr-settings__hint">
                Hiding a game hides its tile and its menus. Nothing you built is deleted.
              </p>
            </fieldset>
          )}

          <fieldset className="sr-settings__group">
            <legend>Back up your settings</legend>
            <button
              type="button"
              className="sr-settings__button"
              onClick={() => {
                void download();
              }}
            >
              Export settings
            </button>
            <label className="sr-settings__choice sr-settings__file">
              Import settings
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  void upload(event);
                }}
              />
            </label>
            <div role="status">{imported && "Settings imported."}</div>
            <div role="alert">
              {problems.map((problem) => (
                <p key={problem}>{problem}</p>
              ))}
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}
