import { Component, Suspense, createElement, lazy } from "react";
import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import type { FamilyManifest, FamilyRoute } from "@salvage-rights/shared";
import { NotFound } from "./NotFound";

const lazyPages = new WeakMap<FamilyRoute, ComponentType>();

const RELOADED_KEY = "sr-reloaded-for-update";

/**
 * Loads a page's code. A page's file is fetched when the page is first opened, and its name changes with every
 * update of the site. A tab left open across an update still asks for the old name, which is gone. So when a load
 * fails, the tab is reloaded once to pick up the current site; if the load fails again after that, the error shows.
 */
export async function loadPage(
  load: FamilyRoute["load"],
  reload: () => void = () => {
    window.location.reload();
  },
): ReturnType<FamilyRoute["load"]> {
  try {
    const page = await load();
    try {
      sessionStorage.removeItem(RELOADED_KEY);
    } catch {
      // Without session storage there is nothing to clear.
    }
    return page;
  } catch (error) {
    let reloadedAlready = true;
    try {
      reloadedAlready = sessionStorage.getItem(RELOADED_KEY) === "1";
      if (!reloadedAlready) sessionStorage.setItem(RELOADED_KEY, "1");
    } catch {
      // Without session storage we cannot tell a first failure from a second, so we do not reload: no loops.
    }
    if (reloadedAlready) throw error;
    reload();
    // The tab is reloading; keep showing "Loading" until it does.
    return new Promise(() => undefined);
  }
}

function pageOf(route: FamilyRoute): ComponentType {
  let page = lazyPages.get(route);
  if (page === undefined) {
    page = lazy(() => loadPage(route.load));
    lazyPages.set(route, page);
  }
  return page;
}

/** Finds the route for `<family>/<rest>`: a family-wide route, or `<game>/<path>` of a ready game. */
function findRoute(family: FamilyManifest, rest: string): FamilyRoute | undefined {
  const familyRoute = family.routes.find((route) => route.path === rest);
  if (familyRoute) return familyRoute;
  const slash = rest.indexOf("/");
  if (slash < 0) return undefined;
  const game = family.games.find((candidate) => candidate.id === rest.slice(0, slash));
  if (!game?.ready) return undefined;
  const path = rest.slice(slash + 1);
  return game.routes.find((route) => route.path === path);
}

interface BoundaryState {
  failed: boolean;
}

class PageErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="sr-page">
        <h1>Something went wrong</h1>
        <p>This page could not be shown. If the site was updated while this tab was open, reloading fixes it.</p>
        <p>
          <button
            type="button"
            className="sr-action"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload
          </button>{" "}
          <Link className="sr-action" to="/">Back to the landing page</Link>
        </p>
      </div>
    );
  }
}

export function FamilyRoutePage({ families }: { families: FamilyManifest[] }) {
  const { family: familyId, "*": rest = "" } = useParams();
  const { pathname } = useLocation();
  const family = families.find((candidate) => candidate.id === familyId);
  const route = family ? findRoute(family, rest) : undefined;
  if (!route) return <NotFound />;
  return (
    <PageErrorBoundary key={pathname}>
      <Suspense fallback={<p role="status" className="sr-page">Loading…</p>}>{createElement(pageOf(route))}</Suspense>
    </PageErrorBoundary>
  );
}
