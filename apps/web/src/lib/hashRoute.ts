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
  return ROUTES.includes(path as AppRoute) ? (path as AppRoute) : "/";
}

export function inviteCodeFromHash(hash = window.location.hash): string {
  const path = hash.replace(/^#/, "") || "/";
  if (!path.startsWith("/join/")) return "";
  return decodeURIComponent(path.slice("/join/".length));
}

export function navigateTo(route: AppRoute) {
  if (typeof window === "undefined") return;
  window.location.hash = route;
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