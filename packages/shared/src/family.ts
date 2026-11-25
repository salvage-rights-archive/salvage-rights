import type { ComponentType } from "react";

export type Measure = "hexes" | "inches" | "meters" | "kilometers";
export type Accent = "rust" | "patina" | "hazard" | "info";
export type Section = "workshop" | "play" | "archive";

export interface Era {
  id: string;
  name: string;
  startYear?: number;
  endYear?: number;
  subEras?: Era[];
}

export interface FamilyRoute {
  /** Relative, no leading slash, e.g. "workshop/unit". */
  path: string;
  label: string;
  section: Section;
  /** The host provides the page's `<main>`; a family page must not render its own. Pages run inside a react-router
   * data router, so hooks such as `useBlocker` are available. */
  load: () => Promise<{ default: ComponentType }>;
}

export interface GameManifest {
  id: string;
  shortName: string;
  fullName: string;
  ready: boolean;
  /** The first route is the page the game's tile entry opens; a ready game needs at least one. */
  routes: FamilyRoute[];
}

export interface UnitTypeManifest {
  id: string;
  name: string;
  ready: boolean;
}

export interface Artwork {
  src: string;
  alt: string;
  credit: string;
  permission: string;
}

export interface Credits {
  owner: string;
  license: string;
  notes: string[];
}

export interface FamilyManifest {
  /** Lower case letters, digits and hyphens. */
  id: string;
  name: string;
  blurb: string;
  accent: Accent;
  artwork?: Artwork;
  games: GameManifest[];
  unitTypes: UnitTypeManifest[];
  eras: Era[];
  measures: Measure[];
  /** Family-wide pages, mounted at /<family id>/<path>. Game routes mount at /<family id>/<game id>/<path>. */
  routes: FamilyRoute[];
  credits: Credits;
}
