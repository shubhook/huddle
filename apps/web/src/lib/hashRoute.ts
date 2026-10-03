import { useEffect, useState } from "react";

export type AppRoute =
  | "/"
  | "/signin"
  | "/signup"
  | "/join"
  | "/app"
  | "/workspace/create";

const ROUTES: AppRoute[] = [
  "/",
  "/signin",
  "/signup",
  "/join",
  "/app",
  "/workspace/create",
];

function normalizeHash(hash: string): AppRoute {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/join" || path.startsWith("/join/")) return "/join";
  if (path.startsWith("/app/")) return "/app";
  return ROUTES.includes(path as AppRoute) ? (path as AppRoute) : "/";
}

export function inviteCodeFromHash(hash = window.location.hash): string {
  const path = hash.replace(/^#/, "") || "/";
  if (!path.startsWith("/join/")) return "";
  return decodeURIComponent(path.slice("/join/".length));
}

/** Workspace id from `#/app/<id>`, or "" when the hash has none. */
export function workspaceIdFromHash(hash = window.location.hash): string {
  const path = hash.replace(/^#/, "");
  if (!path.startsWith("/app/")) return "";
  const id = path.slice("/app/".length).split("/")[0] ?? "";
  return decodeURIComponent(id);
}

interface NavigateOptions {
  /** Only used with "/app": produces `#/app/<workspaceId>`. */
  workspaceId?: string;
  /** Swap the current history entry so Back does not return to the redirect. */
  replace?: boolean;
}

export function navigateTo(route: AppRoute, options: NavigateOptions = {}) {
  if (typeof window === "undefined") return;
  const hash =
    route === "/app" && options.workspaceId
      ? `/app/${encodeURIComponent(options.workspaceId)}`
      : route;

  if (options.replace) {
    const url = `${window.location.pathname}${window.location.search}#${hash}`;
    window.history.replaceState(null, "", url);
    // replaceState does not fire hashchange, so notify the hooks ourselves.
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = hash;
}

export function useHashWorkspaceId(): string {
  const [workspaceId, setWorkspaceId] = useState(() =>
    typeof window === "undefined" ? "" : workspaceIdFromHash(),
  );

  useEffect(() => {
    const handleHashChange = () => setWorkspaceId(workspaceIdFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return workspaceId;
}

export function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window === "undefined"
      ? "/"
      : normalizeHash(window.location.hash),
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(normalizeHash(window.location.hash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return route;
}