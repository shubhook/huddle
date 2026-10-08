import { initials, toneFor } from "@/components/app/format";

interface AvatarProps {
  name: string;
  /** Override the colour picked from the name (1-5). */
  tone?: number;
  /** Small and round, for inline use next to a name. */
  small?: boolean;
}

export function Avatar({ name, tone, small = false }: AvatarProps) {
  const size = small ? " avatar--sm" : "";
  return (
    <span className={`avatar${size} tone-${tone ?? toneFor(name)}`} aria-hidden>
      {initials(name)}
    </span>
  );
}
