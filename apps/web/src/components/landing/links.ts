import type { MouseEvent } from "react";

export const GITHUB_URL = "https://github.com/shubhook/huddle";

// The app routes on the URL hash, so in-page anchors scroll manually
// instead of rewriting the hash and bouncing through the router.
export function scrollToSection(id: string) {
  return (e: MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
}
