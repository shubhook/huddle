import { initials, toneFor } from "@/components/app/format";

interface AvatarProps {
  name: string;
  /** Override the colour picked from the name (1-5). */
  tone?: number;
}

export function Avatar({ name, tone }: AvatarProps) {
  return (
    <span className={`avatar tone-${tone ?? toneFor(name)}`} aria-hidden>
      {initials(name)}
    </span>
  );
}
