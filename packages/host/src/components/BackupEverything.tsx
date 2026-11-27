// One file holding everything kept on this device: the settings and every game family's saved work. What a family
// names as private (a key for an outside service) is left out of the file and never written by a restore.
import { useState } from "react";
import type { ChangeEvent } from "react";
import { exportBackup, importBackup, openStore, readBackupFile } from "@salvage-rights/shared";
import type { BackupStore, FamilyManifest } from "@salvage-rights/shared";

/** Saved pictures make a backup far larger than a settings file. */
const MAX_BACKUP_BYTES = 256 * 1024 * 1024;

const openAll = (families: FamilyManifest[]): Promise<BackupStore[]> =>
  Promise.all([openStore("host").then((store) => ({ store })), ...families.map(async (family) => ({ store: await openStore(family.id), omit: family.privateKeys ?? [] }))]);

export function BackupEverything({ families }: { families: FamilyManifest[] }) {
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  // A backup that was read and is waiting for the player to confirm the restore.
  const [waiting, setWaiting] = useState<{ file: unknown; count: number }>();

  const say = (good: string, bad = "") => {
    setStatus(good);
    setProblem(bad);
  };

  const download = async () => {
    say("");
    try {
      const file = await exportBackup(await openAll(families));
      const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `salvage-rights-backup-${file.exportedAt.slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      say("Backup started.");
    } catch {
      say("", "We could not make the backup file.");
    }
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    say("");
    setWaiting(undefined);
    try {
      if (chosen.size > MAX_BACKUP_BYTES) say("", "That file is too large to be a backup.");
      else {
        const file: unknown = JSON.parse(await chosen.text());
        const read = readBackupFile(file);
        if ("problem" in read) say("", read.problem);
        else setWaiting({ file, count: read.count });
      }
    } catch {
      say("", "That file is not a Salvage Rights backup.");
    }
    input.value = "";
  };

  const restore = async (file: unknown) => {
    setWaiting(undefined);
    try {
      const result = await importBackup(await openAll(families), file);
      if (result.problems.length > 0) say("", result.problems.join(" "));
      else {
        say(`Restored ${String(result.imported)} saved ${result.imported === 1 ? "item" : "items"}. Reloading.`);
        // Every page reads its store when it opens, so the restored work shows after a fresh start.
        window.location.reload();
      }
    } catch {
      say("", "We could not restore that backup.");
    }
  };

  return (
    <fieldset className="sr-settings__group">
      <legend>Back up everything</legend>
      <p className="sr-settings__hint">
        Everything you made is kept in this browser only. A backup is one file with your settings and all your saved work, to keep
        somewhere safe or to move to another device. Keys for outside services are not in it.
      </p>
      <button type="button" className="sr-settings__button" onClick={() => { void download(); }}>
        Back up everything
      </button>
      <label className="sr-settings__choice sr-settings__file">
        Restore a backup
        <input type="file" accept="application/json,.json" onChange={(event) => { void choose(event); }} />
      </label>
      {waiting && (
        <div role="group" aria-label="Confirm restore">
          <p>{`This backup holds ${String(waiting.count)} saved ${waiting.count === 1 ? "item" : "items"}. Restoring replaces anything here that has the same id and keeps the rest.`}</p>
          <button type="button" className="sr-settings__button" onClick={() => { void restore(waiting.file); }}>
            Restore it
          </button>{" "}
          <button type="button" className="sr-settings__button" onClick={() => { setWaiting(undefined); }}>
            Cancel
          </button>
        </div>
      )}
      <div role="status" aria-label="Backup result">{status}</div>
      {problem && <p role="alert">{problem}</p>}
    </fieldset>
  );
}
