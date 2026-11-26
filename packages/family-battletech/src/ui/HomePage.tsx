import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ENGINE_WEIGHTS, INTERNAL_STRUCTURE, MECH_TYPES, SUPERHEAVY } from "../data/chassis";
import type { MechType } from "../data/chassis";
import { baseOf, CLASSIC } from "../data/rulesets";
import { DEFAULT_EDITION, EDITIONS, bookName, editionName, eraLabel } from "../data/editions";
import { configurationAvailable, configurationChoices, erasOfYear, setYear, typeAvailable } from "../rules/availability";
import { levelAtLeast, levelIn, levelRow, techBaseChoices, withLevel } from "../rules/levels";
import { superheavyPhase } from "../rules/time";
import { DEFAULT_AERO_EDITION } from "../data/aero";
import { newAeroRecord } from "../rules/aero";
import type { AeroType } from "../data/aero";
import { loadCatalog } from "../rules/catalog";
import { mechTypeOf, newRecord } from "../rules/mech";
import { fileKind, fromMtf, wrongFileMessage } from "../rules/mordel-files";
import { configurationTitle, newOmniChassis, resolveAll, resolveBase } from "../rules/omni";
import { battleValue } from "../rules/bv";
import { unitCost } from "../rules/cost";
import type { Catalog } from "../rules/catalog";
import type { OmniChassis } from "../rules/omni";
import LevelSelect from "./editor/LevelSelect";
import { OfficialBadge } from "./editor/Marks";
import TypeSelect from "./editor/TypeSelect";
import { startTons, typeReady, typeRow, weightHint } from "./aero/edit";
import { NumberField } from "./aero/fields";
import { AERO_HOME, editorHref } from "./aero/routes";
import { openAeroStorage } from "./aero/storage";
import { INFANTRY_CHOICE, InfantrySaved, startInfantry } from "./infantry/HomePart";
import { newProtoRecord } from "../rules/protomech/record";
import { PROTO_WEIGHT } from "../data/protomech";
import ProtoSavedUnits from "./protomech/ProtoSavedUnits";
import { protoNewOptions } from "./protomech/newOptions";
import { editorHref as protoEditorHref } from "./protomech/routes";
import { openProtoStorage } from "./protomech/storage";
import { MOTIVES } from "../data/vehicle";
import { newVehicleRecord } from "../rules/vehicle/vehicle";
import { startTons as vehicleStartTons } from "./vehicle/edit";
import { vehicleEditorHref } from "./vehicle/routes";
import { openVehicleStorage } from "./vehicle/storage";
import VehicleShelf from "./vehicle/VehicleShelf";
import { WEIGHT_CLASSES } from "../data/battlearmor";
import { newBaRecord } from "../rules/battlearmor/record";
import { suitOffered, weightClassChoices } from "../rules/battlearmor/availability";
import { SavedBattleArmor } from "./battlearmor/SavedBattleArmor";
import { editorHref as baEditorHref } from "./battlearmor/routes";
import { openBaStorage } from "./battlearmor/storage";
import type { MechRecord, NewMechOptions } from "../rules/mech";
import { MAX_LIBRARY_BYTES, STORAGE_READ_FAILED, STORAGE_WRITE_FAILED, downloadLibrary, downloadMech, downloadOmni, fileGame, fromLibraryFile, fromMechFile, fromOmniFile, openFamilyStorage, wrongGameMessage } from "./storage";
import type { FamilyStorage, SavedEntry } from "./storage";
import emptyBay from "../artwork/empty-bay.jpg";
import GamePicture from "./GamePicture";

const MAX_IMPORT_BYTES = 1024 * 1024;
/** This page lists the Classic designs only; Gothic ones are on the Gothic home. */
const classicOnly = (entries: SavedEntry[]) => entries.filter((entry) => entry.game === "classic");
// The choices a new 'Mech starts from, read from the book's own tables.
const TONNAGES = Object.keys(INTERNAL_STRUCTURE.rows).map(Number);
const MAX_RATING = Math.max(...Object.keys(ENGINE_WEIGHTS.rows).map(Number));

const nameOf = (record: MechRecord) => `${record.name.chassis} ${record.name.model}`.trim();
const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;

/** The configurations of one saved chassis, each with its Battle Value and cost, Primary first. */
function Configurations({ chassis, catalog }: { chassis: OmniChassis; catalog: Catalog | undefined }) {
  return (
    <ul className="bt-list bt-row__configs" aria-label={`Configurations of ${chassis.name.chassis}`}>
      {resolveAll(chassis).map((record) => {
        const id = record.omni?.configurationId ?? "";
        const config = chassis.configurations.find((c) => c.id === id);
        const title = config ? configurationTitle(config) : id;
        const figures = catalog ? `Battle Value ${battleValue(record, catalog).total.toLocaleString("en-US")}, ${unitCost(record, catalog).total.toLocaleString("en-US")} C-bills` : "Working out the figures.";
        return (
          <li key={id} className="bt-row">
            <span className="bt-row__text">
              <strong>{`${chassis.name.chassis} ${title}`}</strong>
              {id === chassis.primaryId && " (Primary)"}
              <span className="bt-row__credit">
                <OfficialBadge record={record} />
              </span>
              <span className="bt-row__credit">{figures}</span>
            </span>
            <span className="bt-row__actions">
              <Link className="bt-button" aria-label={`Open ${chassis.name.chassis} ${title}`} to={`/battletech/classic/editor?id=${encodeURIComponent(chassis.id)}&c=${encodeURIComponent(id)}`}>
                Open
              </Link>
              <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${chassis.name.chassis} ${title}`} to={`/battletech/classic/sheet?id=${encodeURIComponent(chassis.id)}&c=${encodeURIComponent(id)}`}>
                Record sheet
              </Link>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function HomePage() {
  const [storage, setStorage] = useState<FamilyStorage>();
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [edition, setEdition] = useState(DEFAULT_EDITION);
  const chosenEdition = useRef<string | null>(null);
  const [confirming, setConfirming] = useState<{ id: string; name: string }>();
  /** The chassis rows opened to show their configurations; the catalog they are valued with loads when the first one opens. */
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [catalog, setCatalog] = useState<Catalog>();
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  /** True after a vehicle file or an Alpha Strike text was picked here: the page then links to the Alpha Strike home. */
  const [offerAs, setOfferAs] = useState(false);
  /** True after a Gothic file was picked here: the page then links to the Gothic home. */
  const [offerGothic, setOfferGothic] = useState(false);
  /** The aerospace unit chosen in the new-unit list, when one is: it opens the AeroTech editor under the current rules. */
  const [aeroType, setAeroType] = useState<string>();
  const [aeroTons, setAeroTons] = useState<number>();
  const [aeroThrust, setAeroThrust] = useState(5);
  /** True when conventional infantry is the choice in the new-unit list: it opens the infantry editor. */
  const [infantryWanted, setInfantryPicked] = useState(false);
  /** The ProtoMech chosen in the new-unit list, when it is: it opens the ProtoMech editor. */
  const [protoType, setProtoType] = useState<string>();
  const [protoTons, setProtoTons] = useState(5);
  const [protoWalk, setProtoWalk] = useState(4);
  /** The Combat Vehicle chosen in the new-unit list, when one is: it opens the vehicle editor. */
  const [vehicleType, setVehicleType] = useState<string>();
  const [vehicleTons, setVehicleTons] = useState<number>();
  const [vehicleCruise, setVehicleCruise] = useState(3);
  /** Battle armor chosen in the new-unit list: it opens the battle armor editor, with the weight class and body picked here. */
  const [baPick, setBaPick] = useState<string>();
  const [baClass, setBaClass] = useState<string>();
  const [baBody, setBaBody] = useState<"humanoid" | "quad">("humanoid");
  /** Bumped when a battle armor unit is saved or deleted, so the list of them reads again. */
  const [baListed, setBaListed] = useState(0);
  /** The year typed in the build form, as text; empty or not a year means no year, and nothing is hidden by time. */
  const [yearText, setYearText] = useState("");
  /** The era picked when the typed year is in two eras (an Inner Sphere era and a Clan sub-era). */
  const [eraPick, setEraPick] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const focusList = useRef(false);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Omit<NewMechOptions, "year">>({
    chassis: "",
    model: "",
    tons: 50,
    walk: 4,
    techBase: "inner-sphere",
    configuration: "biped",
    unitType: "mech",
    rulesLevel: "standard",
  });

  /** Runs a storage action; when it rejects, shows the fixed message and returns false. */
  const attempt = useCallback(async (message: string, action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch {
      setStatus("");
      setProblem(message);
      return false;
    }
  }, []);

  const say = (text: string) => {
    setProblem("");
    setStatus(text);
  };

  useEffect(() => {
    void (async () => {
      try {
        const s = await openFamilyStorage();
        setStorage(s);
        const saved = await s.getEdition();
        // A choice made while storage was still opening wins over the saved one, and is saved now.
        if (chosenEdition.current === null) setEdition(saved);
        else if (chosenEdition.current !== saved) await s.setEdition(chosenEdition.current);
        setEntries(classicOnly(await s.list()));
      } catch {
        setProblem(STORAGE_READ_FAILED);
      }
    })();
  }, []);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!focusList.current) return;
    focusList.current = false;
    (entries.length === 0 ? emptyRef.current : headingRef.current)?.focus();
  }, [entries]);

  const reload = (s: FamilyStorage) => attempt(STORAGE_READ_FAILED, async () => void setEntries(classicOnly(await s.list())));

  const current = EDITIONS.find((e) => e.id === edition);
  const bookLine = (["play", "construction"] as const)
    .flatMap((role) => {
      const book = current?.books.find((b) => b.role === role);
      return book ? [`${role === "play" ? "Play" : "Construction"}: ${bookName(book.title)}, ${book.printing}${book.errata ? `, errata ${book.errata}` : ""}.`] : [];
    })
    .join(" ");

  const chooseEdition = async (id: string) => {
    chosenEdition.current = id;
    setEdition(id);
    if (storage) await attempt(STORAGE_WRITE_FAILED, () => storage.setEdition(id));
  };

  const duplicate = async (record: MechRecord) => {
    if (!storage) return;
    const saved = await attempt(STORAGE_WRITE_FAILED, () =>
      storage.save({
        ...structuredClone(record),
        id: crypto.randomUUID(),
        name: { ...record.name, model: `${record.name.model} (copy)` },
      }),
    );
    if (saved && (await reload(storage))) say("Copy saved.");
  };

  const duplicateOmni = async (chassis: OmniChassis) => {
    if (!storage) return;
    const saved = await attempt(STORAGE_WRITE_FAILED, () => storage.saveOmni({ ...structuredClone(chassis), id: crypto.randomUUID(), name: { ...chassis.name, chassis: `${chassis.name.chassis} (copy)` } }));
    if (saved && (await reload(storage))) say("Copy saved.");
  };

  const remove = async (id: string) => {
    if (!storage) return;
    setConfirming(undefined);
    if (!(await attempt(STORAGE_WRITE_FAILED, () => storage.remove(id)))) return;
    focusList.current = true;
    if (await reload(storage)) say("Deleted.");
  };

  // What the form offers follows the rules level and tech base: a choice that no longer fits gives way to the first that does, so the Type
  // and Configuration lists re-filter as those fields change and nothing offered is out of the rules.
  const yearTyped = /^\d{4}$/.test(yearText.trim()) ? Number(yearText.trim()) : null;
  // The year sets the era: one era holding it is the era, two (an Inner Sphere era and a Clan sub-era) are a choice the player makes, and the choice
  // decides the tech bases offered. Above Introductory the year is needed (and so the pick); Introductory is 3025 technology and may go without.
  // An era whose tech bases the level does not offer (at Introductory, only Inner Sphere) is not a choice here: hide, do not mark.
  const basesHere = techBaseChoices(draft.rulesLevel, "", { year: yearTyped }).map(([value]) => value);
  const yearEras = erasOfYear(yearTyped, CLASSIC).filter((era) => era.techBases === undefined || era.techBases.some((base) => basesHere.includes(base)));
  const eraChosen = yearEras.length === 1 ? yearEras[0] : yearEras.find((era) => era.id === eraPick);
  const aboveIntroductory = (draft.rulesLevel ?? "standard") !== "introductory";
  const missing = aboveIntroductory && yearTyped === null ? `A year is needed at ${levelRow(draft.rulesLevel ?? "standard").label} rules: it sets the era, and the era and year decide what is offered.` : aboveIntroductory && yearEras.length > 1 && eraChosen === undefined ? `The year ${String(yearTyped)} is in two eras; choose one, since it decides the tech base.` : "";
  const when = { year: yearTyped, era: eraChosen?.id };
  const offeredBases = techBaseChoices(draft.rulesLevel, "", when); // the current choice is not kept here: one the year or era rules out gives way to the first offered
  const techBase = (offeredBases.some(([value]) => value === draft.techBase) ? draft.techBase : (offeredBases[0]?.[0] ?? "inner-sphere")) as NewMechOptions["techBase"];
  const subject = { techBase, year: yearTyped, era: eraChosen?.id, rulesLevel: draft.rulesLevel };
  const usable = (id: MechType) => MECH_TYPES.find((t) => t.id === id)?.ready === true && typeAvailable(id, subject);
  const unitType: MechType = draft.unitType !== undefined && usable(draft.unitType) ? draft.unitType : (MECH_TYPES.find((t) => usable(t.id))?.id ?? "mech");
  const typed = { ...subject, unitType };
  const configurations = configurationChoices(typed, "");
  const configuration = configurationAvailable(draft.configuration, typed) ? draft.configuration : ((configurations[0]?.[0] ?? "biped") as NewMechOptions["configuration"]);
  const limits = mechTypeOf({ unitType }).tonnage;
  // Superheavy weights are offered where the type may be one, at Advanced rules (Experimental in its prototype years), in the Inner Sphere and in the body's years (hide, do not mark).
  const heavyPhase = superheavyPhase({ year: yearTyped, era: eraChosen?.id, editionId: edition, unitType, configuration, tons: SUPERHEAVY.minTons });
  const heavyOffered = mechTypeOf({ unitType }).superheavy === true && techBase === "inner-sphere" && heavyPhase !== null && levelAtLeast(draft.rulesLevel ?? "standard", levelIn(SUPERHEAVY.rulesLevel, heavyPhase));
  const tonnages = [...TONNAGES.filter((t) => t >= limits.min && t <= limits.max), ...(heavyOffered && configuration !== "lam" && configuration !== "bimodal-lam" ? Object.keys(SUPERHEAVY.structure.rows).map(Number) : [])];
  const tons = tonnages.includes(draft.tons) ? draft.tons : (tonnages.find((t) => t >= draft.tons) ?? tonnages.at(-1) ?? draft.tons);

  // The walking speeds the largest engine in the table allows at this tonnage.
  // A Primitive 'Mech's engine is built a fifth higher than the speed needs (IO:AE p.117), and must still be in the table.
  const walks = Array.from({ length: Math.floor(MAX_RATING / (mechTypeOf({ unitType }).primitive?.ratingFactor ?? 1) / tons) }, (_, i) => i + 1);

  // The aerospace units the current rules build, offered at the rules levels that include them (hidden below, never marked).
  const aeroOptions = (["aerospace-fighter", "conventional-fighter", "small-craft", "dropship"] as const).flatMap((type) => {
    const row = typeRow(DEFAULT_AERO_EDITION, type);
    if (!row || !typeReady(DEFAULT_AERO_EDITION, type) || !levelAtLeast(draft.rulesLevel ?? "standard", row.level ?? "standard")) return [];
    return [{ id: type, label: row.label, note: `${row.label}: built under the current rules and opened in the AeroTech editor. ${row.cite}.`, row }];
  });
  const aeroPicked = aeroOptions.find((option) => option.id === aeroType);
  const aeroRow = aeroPicked?.row;

  // The ProtoMech the current rules build (Clan only, from its prototype years), offered where the level, year and era allow it (hidden, never marked).
  const protoOptions = protoNewOptions({ rulesLevel: draft.rulesLevel, year: yearTyped, era: eraChosen?.id, clanOffered: offeredBases.some(([value]) => value === "clan") });
  const protoPicked = protoOptions.some((option) => option.id === protoType);
  // Infantry is Level Two (Total Warfare p. 9): not offered at Introductory.
  const infantryOffered = levelAtLeast(draft.rulesLevel ?? "standard", "standard");
  const infantryPicked = infantryWanted && infantryOffered;
  const buildProto = async () => {
    if (!storage || !draft.chassis.trim() || missing !== "") return;
    const made = newProtoRecord({ chassis: draft.chassis.trim(), model: draft.model.trim(), tons: protoTons, walk: protoWalk, year: yearTyped, ...(eraChosen ? { era: eraChosen.id } : {}), rulesLevel: draft.rulesLevel });
    const protoStorage = await openProtoStorage().catch(() => undefined);
    if (!protoStorage || !(await attempt(STORAGE_WRITE_FAILED, () => protoStorage.save(made)))) return;
    void navigate(protoEditorHref(made.id));
  };

  // The Combat Vehicles the rules level offers (hidden below, never marked).
  const vehicleOptions = MOTIVES.filter((m) => levelAtLeast(draft.rulesLevel ?? "standard", m.level)).map((m) => ({ id: m.id, label: m.label, note: `${m.label}: a combat vehicle of up to ${String(m.maxTons)} tons, built under TechManual and opened in the vehicle editor.`, row: m }));
  const vehiclePicked = vehicleOptions.find((option) => option.id === vehicleType);
  const vehicleTonnage = vehicleTons ?? vehicleStartTons(vehiclePicked?.id ?? "");
  const buildVehicle = async () => {
    if (!storage || !vehiclePicked || !draft.chassis.trim() || vehicleTonnage < 1 || missing !== "") return;
    const made = newVehicleRecord({
      id: crypto.randomUUID(),
      chassis: draft.chassis.trim(),
      model: draft.model.trim(),
      motive: vehiclePicked.row.id,
      techBase,
      tons: vehicleTonnage,
      cruise: Math.max(vehiclePicked.row.minCruise ?? 1, vehicleCruise),
      year: yearTyped,
      ...(eraChosen ? { era: eraChosen.id } : {}),
      rulesLevel: draft.rulesLevel,
      editionId: edition,
    });
    const vehicleStorage = await openVehicleStorage().catch(() => undefined);
    if (!vehicleStorage || !(await attempt(STORAGE_WRITE_FAILED, () => vehicleStorage.save(made)))) return;
    void navigate(vehicleEditorHref(made.id));
  };

  // Battle armor: offered at the levels that include it (Standard and above) while some weight class exists for the year and tech base (hide, do not mark).
  const baSubject = { techBase: techBase === "clan" ? ("clan" as const) : ("inner-sphere" as const), year: yearTyped, era: eraChosen?.id, rulesLevel: draft.rulesLevel, editionId: edition };
  const baClasses = suitOffered(draft.rulesLevel) && techBase !== "mixed" ? weightClassChoices(baSubject) : [];
  const baOptions = baClasses.length === 0 ? [] : [{ id: "battlearmor", label: "Battle armor", note: "Battle armor: a squad or Point of suits, built under TechManual and opened in the battle armor editor. TechManual, p. 160." }];
  const baPicked = baOptions.find((option) => option.id === baPick);
  const baClassId = baClasses.find((row) => row.id === baClass)?.id ?? baClasses[0]?.id ?? WEIGHT_CLASSES[1]?.id ?? "light";

  const buildBa = async () => {
    if (!storage || !baPicked || !draft.chassis.trim() || missing !== "") return;
    const made = newBaRecord(
      { id: crypto.randomUUID(), chassis: draft.chassis.trim(), model: draft.model.trim(), techBase: baSubject.techBase, year: yearTyped, ...(eraChosen ? { era: eraChosen.id } : {}), rulesLevel: draft.rulesLevel, weightClass: baClassId as (typeof WEIGHT_CLASSES)[number]["id"], body: baClassId === "pal" ? "humanoid" : baBody },
      edition,
    );
    const baStorage = await openBaStorage().catch(() => undefined);
    if (!baStorage || !(await attempt(STORAGE_WRITE_FAILED, () => baStorage.save(made)))) return;
    setBaListed((n) => n + 1);
    void navigate(baEditorHref(made.id));
  };

  const buildAero = async () => {
    const aeroTonnage = aeroTons ?? startTons(aeroRow ?? undefined);
    if (!storage || !aeroPicked || !aeroRow || !draft.chassis.trim() || aeroTonnage <= 0 || missing !== "") return;
    const made = newAeroRecord(
      {
        id: crypto.randomUUID(),
        chassis: draft.chassis.trim(),
        model: draft.model.trim(),
        unitType: aeroPicked.id as AeroType,
        techBase,
        tons: aeroTonnage,
        safeThrust: aeroThrust,
        year: yearTyped,
        ...(eraChosen ? { era: eraChosen.id } : {}),
        rulesLevel: draft.rulesLevel,
      },
      DEFAULT_AERO_EDITION,
    );
    const aeroStorage = await openAeroStorage().catch(() => undefined);
    if (!aeroStorage || !(await attempt(STORAGE_WRITE_FAILED, () => aeroStorage.save(made)))) return;
    void navigate(editorHref(made.id));
  };

  const build = async () => {
    if (protoPicked) return buildProto();
    if (baPicked) return buildBa();
    if (aeroPicked) return buildAero();
    if (vehiclePicked) return buildVehicle();
    if (infantryPicked) {
      if (missing !== "" || !draft.chassis.trim()) return;
      const id = await startInfantry({ name: draft.chassis.trim(), model: draft.model.trim(), techBase, year: yearTyped, era: eraChosen?.id, rulesLevel: draft.rulesLevel }).catch(() => undefined);
      if (id === undefined) setProblem(STORAGE_WRITE_FAILED);
      else void navigate(`/battletech/classic/infantry-editor?id=${encodeURIComponent(id)}`);
      return;
    }
    if (!storage || !draft.chassis.trim() || missing !== "") return;
    const options = { ...draft, techBase, configuration, tons, chassis: draft.chassis.trim(), model: draft.model.trim(), walk: Math.min(draft.walk, walks.at(-1) ?? 1), year: yearTyped };
    // An OmniMech is a chassis (its fixed base and a Prime to start) and is saved as one.
    const made = unitType === "omnimech" ? newOmniChassis(options, edition, crypto.randomUUID()) : newRecord({ ...options, unitType }, edition, crypto.randomUUID());
    if ("mounts" in made) {
      setYear(made, yearTyped);
      if (eraChosen) made.era = eraChosen.id;
    }
    if (!(await attempt(STORAGE_WRITE_FAILED, () => ("base" in made ? storage.saveOmni(made) : storage.save(made))))) return;
    void navigate(`/battletech/classic/editor?id=${encodeURIComponent(made.id)}`);
  };

  const cancel = () => {
    setConfirming(undefined);
    openerRef.current?.focus();
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen || !storage) return;
    say("");
    setOfferGothic(false);
    let message = "";
    if (chosen.size > MAX_LIBRARY_BYTES) {
      message = "That file is too large to be a 'Mech file.";
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await chosen.text());
      } catch {
        message = chosen.size > MAX_IMPORT_BYTES ? "That file is too large to be a 'Mech file." : "That file is not a 'Mech file.";
      }
      const kindOf = typeof parsed === "object" && parsed !== null && "kind" in parsed ? parsed.kind : undefined;
      const wrong = message ? undefined : wrongGameMessage("classic", fileGame(parsed));
      if (wrong) {
        message = wrong;
        setOfferGothic(true);
      }
      if (!message && kindOf !== "library" && chosen.size > MAX_IMPORT_BYTES) message = "That file is too large to be a 'Mech file.";
      if (!message && kindOf === "library") {
        const library = fromLibraryFile(parsed);
        if (!library.ok) message = library.message;
        else {
          const done = await attempt(STORAGE_WRITE_FAILED, async () => {
            const catalog = await loadCatalog();
            const used = new Set((await storage.list()).map((e) => e.id));
            const idFor = (id: string) => {
              const next = used.has(id) ? crypto.randomUUID() : id;
              used.add(next);
              return next;
            };
            for (const record of library.mechs) await storage.save({ ...withLevel(record, catalog), id: idFor(record.id) });
            for (const chassis of library.omnis) await storage.saveOmni({ ...chassis, id: idFor(chassis.id) });
          });
          if (done && (await reload(storage))) say(`${plural(library.mechs.length + library.omnis.length, "design")} imported.`);
        }
      } else if (!message) {
        const result = kindOf === "omni" ? fromOmniFile(parsed) : fromMechFile(parsed);
        if (!result.ok) {
          message = result.message;
        } else if ("chassis" in result) {
          const done = await attempt(STORAGE_WRITE_FAILED, async () => {
            const taken = (await storage.list()).some((e) => e.id === result.chassis.id);
            await storage.saveOmni(taken ? { ...result.chassis, id: crypto.randomUUID() } : result.chassis);
          });
          if (done && (await reload(storage))) say("OmniMech imported.");
        } else {
          const done = await attempt(STORAGE_WRITE_FAILED, async () => {
            const taken = (await storage.list()).some((e) => e.id === result.record.id);
            const record = withLevel(result.record, await loadCatalog());
            await storage.save(taken ? { ...record, id: crypto.randomUUID() } : record);
          });
          if (done && (await reload(storage))) say("'Mech imported.");
        }
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  /** A file downloaded from a Mordel unit page: a 'Mech file opens in the editor, unsaved, for the player to review. */
  const uploadMordel = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const chosen = input.files?.[0];
    if (!chosen) return;
    say("");
    setOfferAs(false);
    let message = "";
    if (chosen.size > MAX_IMPORT_BYTES) message = "That file is too large to be a Mordel file.";
    else if (/\.pdf$/i.test(chosen.name)) message = wrongFileMessage("pdf", "mtf");
    else {
      try {
        const text = await chosen.text();
        const kind = fileKind(text, chosen.name);
        if (kind !== "mtf") {
          message = wrongFileMessage(kind, "mtf");
          setOfferAs(kind === "blk" || kind === "as-conversion");
        } else {
          const result = fromMtf(text, await loadCatalog(), edition, new Date().toISOString(), () => crypto.randomUUID());
          if (!result.ok) message = result.message;
          else void navigate("/battletech/classic/editor", { state: { draft: result.record, notes: result.notes } });
        }
      } catch {
        message = "We could not read that file.";
      }
    }
    if (message) setProblem(message);
    input.value = "";
  };

  const askDelete = (target: { id: string; name: string }, opener: HTMLElement) => {
    openerRef.current = opener;
    setConfirming(target);
  };

  return (
    <div className="sr-page">
      <h1>Classic BattleTech</h1>
      <GamePicture game="classic" />
      {storage && !storage.persistent && (
        <p className="bt-warning">This browser is not letting us save. Your 'Mechs last until you close this tab.</p>
      )}
      <div role="status">{status}</div>
      <div role="alert" className="bt-problem">
        {problem}
      </div>
      {offerGothic && (
        <p>
          <Link className="sr-action" to={`${baseOf("gothic")}/home`}>
            Go to the Gothic home
          </Link>
        </p>
      )}
      {offerAs && (
        <p>
          <Link className="sr-action" to="/battletech/alpha-strike/home">
            Go to the Alpha Strike home
          </Link>
        </p>
      )}

      <section className="bt-section" aria-labelledby="bt-edition">
        <h2 id="bt-edition">Built under</h2>
        <div className="bt-field">
          <label htmlFor="bt-edition-select">Edition</label>
          <select
            id="bt-edition-select"
            value={edition}
            onChange={(event) => {
              void chooseEdition(event.target.value);
            }}
          >
            {EDITIONS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {bookLine && <p className="bt-hint">{bookLine}</p>}
        <p className="bt-hint">
          Both editions build from the TechManual; the Core Rulebook publishes no construction rules. They differ in the play
          book the sheet and the rules check cite.
        </p>
      </section>

      <section className="bt-section" aria-labelledby="bt-saved">
        <h2 id="bt-saved" ref={headingRef} tabIndex={-1}>
          Your 'Mechs
        </h2>
        {storage && entries.length === 0 ? (
          <div className="bt-empty">
            {/* Decorative: the line below says what the empty bay means. Terms: ../artwork/NOTICE.md. */}
            <img src={emptyBay} alt="" width={1200} height={670} />
            <p ref={emptyRef} tabIndex={-1}>
              No 'Mechs saved yet.
            </p>
            <p className="bt-hint">Picture: AI-generated image (Nano Banana 2).</p>
          </div>
        ) : (
          <ul className="bt-list">
            {entries.map((entry) => {
              const record = entry.record;
              const chassis = entry.chassis;
              if (chassis) {
                const name = chassis.name.chassis.trim() || "Unnamed OmniMech";
                return (
                  <li key={`omni-${entry.id}`} className="bt-row">
                    <span className="bt-row__text">
                      <strong>{name}</strong> OmniMech, {chassis.tons} tons, {plural(chassis.configurations.length, "configuration")}
                      <span className="bt-row__credit">
                        Base chassis: <OfficialBadge record={resolveBase(chassis)} />
                      </span>
                      <span className="bt-row__credit">Built under {EDITIONS.find((e) => e.id === chassis.editionId)?.name ?? chassis.editionId}</span>
                    </span>
                    <span className="bt-row__actions">
                      <button
                        type="button"
                        className="bt-button bt-button--secondary"
                        aria-expanded={open.has(entry.id)}
                        aria-controls={`omni-configs-${entry.id}`}
                        aria-label={`Configurations of ${name}`}
                        onClick={() => {
                          const next = new Set(open);
                          if (next.has(entry.id)) next.delete(entry.id);
                          else next.add(entry.id);
                          setOpen(next);
                          if (!catalog) void loadCatalog().then(setCatalog);
                        }}
                      >
                        Configurations
                      </button>
                      <Link className="bt-button" aria-label={`Open ${name}`} to={`/battletech/classic/editor?id=${encodeURIComponent(chassis.id)}`}>
                        Open
                      </Link>
                      <Link className="bt-button bt-button--secondary" aria-label={`Record sheet for ${name}`} to={`/battletech/classic/sheet?id=${encodeURIComponent(chassis.id)}`}>
                        Record sheet
                      </Link>
                      <button type="button" className="bt-button bt-button--secondary" aria-label={`Duplicate ${name}`} onClick={() => { void duplicateOmni(chassis); }}>
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="bt-button bt-button--secondary"
                        aria-label={`Export ${name}`}
                        onClick={() => {
                          downloadOmni(chassis);
                          say("Export started.");
                        }}
                      >
                        Export
                      </button>
                      <button type="button" className="bt-button bt-button--secondary" aria-label={`Delete ${name}`} onClick={(event) => { askDelete({ id: entry.id, name }, event.currentTarget); }}>
                        Delete
                      </button>
                    </span>
                    <div id={`omni-configs-${entry.id}`} className="bt-row__configs" hidden={!open.has(entry.id)}>
                      {open.has(entry.id) && <Configurations chassis={chassis} catalog={catalog} />}
                    </div>
                  </li>
                );
              }
              if (!record) {
                return (
                  <li key={entry.id} className="bt-row">
                    <span className="bt-row__text">This saved 'Mech cannot be read. {entry.unreadable}</span>
                    <span className="bt-row__actions">
                      <button
                        type="button"
                        className="bt-button bt-button--secondary"
                        onClick={(event) => {
                          askDelete({ id: entry.id, name: "this 'Mech" }, event.currentTarget);
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                );
              }
              const name = nameOf(record);
              return (
                <li key={entry.id} className="bt-row">
                  <span className="bt-row__text">
                    <strong>{name}</strong> {record.tons} tons
                    <span className="bt-row__credit">
                      <OfficialBadge record={record} />
                    </span>
                    <span className="bt-row__credit">
                      Built under {editionName(record.editionId)}
                    </span>
                    {record.source?.kind === "mordel" && (
                      <span className="bt-row__credit">
                        Designed by {record.source.designer || "an unnamed designer"} on mordel.net
                      </span>
                    )}
                  </span>
                  <span className="bt-row__actions">
                    <Link
                      className="bt-button"
                      aria-label={`Open ${name}`}
                      to={`/battletech/classic/editor?id=${encodeURIComponent(record.id)}`}
                    >
                      Open
                    </Link>
                    <Link
                      className="bt-button bt-button--secondary"
                      aria-label={`Record sheet for ${name}`}
                      to={`/battletech/classic/sheet?id=${encodeURIComponent(record.id)}`}
                    >
                      Record sheet
                    </Link>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Duplicate ${name}`}
                      onClick={() => {
                        void duplicate(record);
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Export ${name}`}
                      onClick={() => {
                        downloadMech(record);
                        say("Export started.");
                      }}
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      className="bt-button bt-button--secondary"
                      aria-label={`Delete ${name}`}
                      onClick={(event) => {
                        askDelete({ id: entry.id, name }, event.currentTarget);
                      }}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <InfantrySaved />
        {entries.some((e) => e.record !== undefined || e.chassis !== undefined) && (
          <p>
            <button
              type="button"
              className="bt-button bt-button--secondary"
              onClick={() => {
                downloadLibrary(entries);
                const left = entries.filter((e) => !e.record && !e.chassis).length;
                say(left === 0 ? "Export started." : `Export started. ${plural(left, "saved design")} that cannot be read ${left === 1 ? "was" : "were"} left out.`);
              }}
            >
              Export all
            </button>
          </p>
        )}
        {confirming && (
          <div
            className="bt-confirm"
            role="group"
            aria-label="Confirm delete"
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          >
            <p>{`Delete ${confirming.name}? This cannot be undone.`}</p>
            <span className="bt-row__actions">
              <button
                type="button"
                className="bt-button"
                onClick={() => {
                  void remove(confirming.id);
                }}
              >
                Delete
              </button>
              <button type="button" ref={keepRef} className="bt-button bt-button--secondary" onClick={cancel}>
                Keep
              </button>
            </span>
          </div>
        )}
      </section>

      <ProtoSavedUnits />
      <VehicleShelf />
      <SavedBattleArmor key={baListed} />

      <section className="bt-section" aria-labelledby="bt-add">
        <h2 id="bt-add">Add a 'Mech</h2>
        <form
          className="bt-new"
          aria-labelledby="bt-new-heading"
          onSubmit={(event) => {
            event.preventDefault();
            void build();
          }}
        >
          <h3 id="bt-new-heading">Build a new one</h3>
          <div className="bt-grid">
            <div className="bt-field">
              <label htmlFor="bt-new-chassis">Name</label>
              <input id="bt-new-chassis" required value={draft.chassis} onChange={(e) => setDraft({ ...draft, chassis: e.target.value })} />
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-model">Model</label>
              <input id="bt-new-model" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
            </div>
            <TypeSelect
              id="bt-new-type"
              record={typed}
              onChange={(next) => { setDraft({ ...draft, unitType: next }); }}
              families={[
                {
                  prefix: "vehicle:",
                  label: "Vehicles (opens the vehicle editor)",
                  choices: {
                    options: vehicleOptions,
                    chosen: vehiclePicked?.id,
                    onChoose: (id) => {
                      setVehicleType(id);
                      setVehicleTons(undefined);
                    },
                  },
                },
                {
                  prefix: "aero:",
                  label: "Aerospace (opens the AeroTech editor)",
                  choices: {
                    options: aeroOptions,
                    chosen: aeroPicked?.id,
                    onChoose: (id) => {
                      setAeroType(id);
                      setAeroTons(undefined);
                    },
                  },
                },
                {
                  prefix: "protomech:",
                  label: "ProtoMech (opens the ProtoMech editor)",
                  choices: {
                    options: protoOptions,
                    chosen: protoPicked ? protoType : undefined,
                    onChoose: setProtoType,
                  },
                },
                {
                  prefix: "ba:",
                  label: "Battle armor (opens the battle armor editor)",
                  choices: { options: baOptions, chosen: baPicked?.id, onChoose: setBaPick },
                },
                {
                  prefix: "infantry:",
                  label: "Infantry (opens the infantry editor)",
                  choices: { options: infantryOffered ? [INFANTRY_CHOICE] : [], chosen: infantryPicked ? INFANTRY_CHOICE.id : undefined, onChoose: (id) => { setInfantryPicked(id !== undefined); } },
                },
              ]}
            />
            {!aeroPicked && !protoPicked && !vehiclePicked && !baPicked && !infantryPicked && (
            <div className="bt-field">
              <label htmlFor="bt-new-config">Configuration</label>
              <select
                id="bt-new-config"
                value={configuration}
                onChange={(e) => setDraft({ ...draft, configuration: e.target.value as NewMechOptions["configuration"] })}
              >
                {configurations.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            )}
            <LevelSelect
              id="bt-new-level"
              record={draft}
              onChange={(rulesLevel) => {
                // A tech base the new level does not offer gives way to Inner Sphere (Clan below Standard, Mixed below Advanced).
                const fits = techBaseChoices(rulesLevel, "inner-sphere", when).some(([value]) => value === draft.techBase);
                setDraft({ ...draft, rulesLevel, techBase: fits ? draft.techBase : "inner-sphere" });
              }}
            />
            <div className="bt-field">
              <label htmlFor="bt-new-year">Year</label>
              <input
                id="bt-new-year"
                inputMode="numeric"
                maxLength={4}
                value={yearText}
                aria-invalid={aboveIntroductory && yearTyped === null ? true : undefined}
                aria-describedby="bt-new-year-hint"
                onChange={(e) => { setYearText(e.target.value); }}
              />
              <span id="bt-new-year-hint" className="bt-hint">
                {aboveIntroductory ? "Needed. The year sets the era and hides the body types, parts and tech bases that did not exist yet." : "Optional at Introductory, which is 3025 technology. A year sets the era and hides what did not exist yet."}
              </span>
            </div>
            {yearEras.length === 1 && (
              <div className="bt-field">
                <span id="bt-new-era-label" className="bt-label">Era</span>
                <span id="bt-new-era" aria-labelledby="bt-new-era-label">{yearEras[0] ? eraLabel(yearEras[0]) : ""}</span>
              </div>
            )}
            {yearEras.length > 1 && (
              <div className="bt-field">
                <label htmlFor="bt-new-era-pick">Era</label>
                <select id="bt-new-era-pick" value={eraChosen?.id ?? ""} onChange={(e) => { setEraPick(e.target.value); }}>
                  <option value="">Choose an era</option>
                  {yearEras.map((era) => (
                    <option key={era.id} value={era.id}>{eraLabel(era)}</option>
                  ))}
                </select>
              </div>
            )}
            {protoPicked ? (
              <div className="bt-field">
                <span className="bt-label">Tech base</span>
                <span>Clan</span>
              </div>
            ) : (
            <div className="bt-field">
              <label htmlFor="bt-new-tech">Tech base</label>
              <select id="bt-new-tech" value={infantryPicked && techBase === "mixed" ? "inner-sphere" : techBase} onChange={(e) => setDraft({ ...draft, techBase: e.target.value as NewMechOptions["techBase"] })}>
                {techBaseChoices(draft.rulesLevel, techBase, when).filter(([value]) => !(infantryPicked && value === "mixed")).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            )}
            {protoPicked ? (
              <>
                <div className="bt-field">
                  <label htmlFor="bt-new-proto-tons">Tonnage</label>
                  <select id="bt-new-proto-tons" value={protoTons} onChange={(e) => { setProtoTons(Number(e.target.value)); }}>
                    {Array.from({ length: PROTO_WEIGHT.standardMax - PROTO_WEIGHT.min + 1 }, (_, i) => PROTO_WEIGHT.min + i).map((each) => (
                      <option key={each} value={each}>{each} tons</option>
                    ))}
                  </select>
                </div>
                <div className="bt-field">
                  <label htmlFor="bt-new-proto-walk">Walking MP</label>
                  <select id="bt-new-proto-walk" value={protoWalk} onChange={(e) => { setProtoWalk(Number(e.target.value)); }}>
                    {Array.from({ length: 14 }, (_, i) => i + 1).map((walk) => (
                      <option key={walk} value={walk}>{walk}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : vehiclePicked ? (
              <>
                <NumberField id="bt-new-vehicle-tons" label="Tonnage" value={vehicleTonnage} min={1} hint={`Whole tons, 1 to ${String(vehiclePicked.row.maxTons)}.`} onValid={(tons) => { setVehicleTons(tons ?? undefined); }} />
                <NumberField id="bt-new-vehicle-cruise" label="Cruising MP" value={vehicleCruise} min={1} hint={vehiclePicked.row.minCruise === undefined ? undefined : `At least ${String(vehiclePicked.row.minCruise)}.`} onValid={(cruise) => { setVehicleCruise(cruise ?? 1); }} />
              </>
            ) : baPicked ? (
              <>
                <div className="bt-field">
                  <label htmlFor="bt-new-ba-class">Weight class</label>
                  <select id="bt-new-ba-class" value={baClassId} onChange={(e) => { setBaClass(e.target.value); }}>
                    {baClasses.map((row) => (
                      <option key={row.id} value={row.id}>{`${row.label} (${String(row.minKg)} to ${String(row.maxKg)} kg)`}</option>
                    ))}
                  </select>
                </div>
                <div className="bt-field">
                  <label htmlFor="bt-new-ba-body">Body</label>
                  <select id="bt-new-ba-body" value={baClassId === "pal" ? "humanoid" : baBody} disabled={baClassId === "pal"} onChange={(e) => { setBaBody(e.target.value === "quad" ? "quad" : "humanoid"); }}>
                    <option value="humanoid">Humanoid</option>
                    <option value="quad">Quad</option>
                  </select>
                </div>
              </>
            ) : aeroPicked && aeroRow ? (
              <>
                <NumberField id="bt-new-aero-tons" label="Tonnage" value={aeroTons ?? startTons(aeroRow)} min={0} hint={weightHint(aeroRow.weight)} onValid={(tons) => { setAeroTons(tons ?? undefined); }} />
                <NumberField id="bt-new-aero-thrust" label="Safe Thrust" value={aeroThrust} min={0} onValid={(thrust) => { setAeroThrust(thrust ?? 0); }} />
              </>
            ) : infantryPicked ? null : (
            <>
            <div className="bt-field">
              <label htmlFor="bt-new-tons">Tonnage</label>
              <select id="bt-new-tons" value={tons} onChange={(e) => setDraft({ ...draft, tons: Number(e.target.value) })}>
                {tonnages.map((each) => (
                  <option key={each} value={each}>
                    {each} tons
                  </option>
                ))}
              </select>
            </div>
            <div className="bt-field">
              <label htmlFor="bt-new-walk">Walking MP</label>
              <select id="bt-new-walk" value={Math.min(draft.walk, walks.at(-1) ?? 1)} onChange={(e) => setDraft({ ...draft, walk: Number(e.target.value) })}>
                {walks.map((walk) => (
                  <option key={walk} value={walk}>
                    {walk} (engine rating {walk * tons})
                  </option>
                ))}
              </select>
            </div>
            </>
            )}
          </div>
          <p className="bt-hint">
            {infantryPicked ? (
              "You start with a platoon of the standard size for its type and affiliation, no weapons and no armor. The infantry rules check shows what is left to do."
            ) : protoPicked ? (
              "You start with the chassis and an engine for the walking speed, no jump jets, no heat sinks, no armor and no equipment. The ProtoMech editor's rules check shows what is left to do."
            ) : vehiclePicked ? (
              "You start with a standard fusion engine and its ten free heat sinks (an internal combustion engine gives none), no armor, no turret and no equipment. The vehicle editor's rules check shows what is left to do."
            ) : baPicked ? (
              "You start with the chassis, its free ground MP, no armor and no equipment. The battle armor editor's rules check shows what is left to do."
            ) : aeroPicked ? (
              "You start with a standard engine, no fuel, no armor, no heat sinks and no equipment. The AeroTech editor's rules check shows what is left to do."
            ) : (
              <>
                {unitType === "industrialmech" ? "You start with an industrial frame and cockpit, a standard fusion engine" : "You start with standard parts"}, ten heat sinks, no armor and no equipment.{" "}
                {unitType === "omnimech" && "An OmniMech starts as a base chassis with an empty Prime configuration. "}The editor's rules check shows what is left to do.
              </>
            )}
          </p>
          {missing !== "" && <p id="bt-new-missing" className="bt-hint">{missing}</p>}
          <button type="submit" className="bt-button" disabled={!storage || missing !== "" || (aeroPicked !== undefined && (aeroTons ?? startTons(aeroRow)) <= 0) || (vehiclePicked !== undefined && vehicleTonnage < 1)} aria-describedby={missing === "" ? undefined : "bt-new-missing"}>
            Start building
          </button>
        </form>
        <p>
          <Link className="sr-action" to="/battletech/classic/import">
            Import from Mordel
          </Link>
        </p>
        <p>
          <Link className="sr-action" to={AERO_HOME}>
            Go to the AeroTech home
          </Link>
        </p>
        <div className="bt-field">
          <label htmlFor="bt-mordel-file">Import a file from Mordel</label>
          <input
            id="bt-mordel-file"
            type="file"
            accept=".mtf,.blk,.txt,text/plain"
            aria-describedby="bt-mordel-file-hint"
            onChange={(event) => {
              void uploadMordel(event);
            }}
          />
          <p id="bt-mordel-file-hint" className="bt-hint">
            The 'Mech file (.mtf) from a mordel.net unit page. It opens in the editor for you to review and is saved only when you save it. No key is needed.
          </p>
        </div>
        <div className="bt-field">
          <label htmlFor="bt-file">Import a file</label>
          <input
            id="bt-file"
            type="file"
            accept="application/json,.json"
            aria-describedby="bt-file-hint"
            disabled={!storage}
            onChange={(event) => {
              void upload(event);
            }}
          />
          <p id="bt-file-hint" className="bt-hint">
            One 'Mech or OmniMech, or the file Export all makes. Designs whose id you already have are added as new ones.
          </p>
        </div>
      </section>
    </div>
  );
}
