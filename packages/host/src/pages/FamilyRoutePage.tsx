import { Component, Suspense, createElement, lazy } from "react";
import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import type { FamilyManifest, FamilyRoute } from "@salvage-rights/shared";
import { NotFound } from "./NotFound";

const lazyPages = new WeakMap<FamilyRoute, ComponentType>();

function pageOf(route: FamilyRoute): ComponentType {
  let page = lazyPages.get(route);
  if (page === undefined) {
    page = lazy(route.load);
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
        <p>
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
