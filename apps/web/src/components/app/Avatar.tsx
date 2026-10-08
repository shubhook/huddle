import { useState } from "react";

import { initials, toneFor } from "@/components/app/format";

interface AvatarProps {
  name: string;
  /** Override the colour picked from the name (1-5). */
  tone?: number;
  /** Small and round, for inline use next to a name. */
  small?: boolean;
  /** Profile picture. Falls back to initials while missing or if it fails to load. */
  src?: string;
}

export function Avatar({ name, tone, small = false, src }: AvatarProps) {
  const [failed, setFailed] = useState<string>();
  const size = small ? " avatar--sm" : "";
  const showImage = src && failed !== src;

  return (
    <span className={`avatar${size} tone-${tone ?? toneFor(name)}`} aria-hidden>
      {showImage ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
