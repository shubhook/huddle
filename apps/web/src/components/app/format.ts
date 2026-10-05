/** Two-letter initials: "maya" -> "MA", "ravi kumar" -> "RK". */
export function initials(name: string): string {
  const parts = name.replace(/[_.-]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** A stable avatar colour (tone-2..tone-4) for a name. tone-1 is kept for "you". */
export function toneFor(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 3) + 2;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 86_400_000;

function daysAgo(iso: string): number {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / DAY_MS);
}

export function sameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

/** Separator label in the feed: "Today", "Yesterday", "Monday, Oct 3". */
export function dayLabel(iso: string): string {
  const days = daysAgo(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Compact time for the channel list: "2:41 PM", "Yesterday", "Mon", "Oct 3". */
export function shortWhen(iso: string): string {
  const days = daysAgo(iso);
  if (days === 0) return clockTime(iso);
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
  }
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
