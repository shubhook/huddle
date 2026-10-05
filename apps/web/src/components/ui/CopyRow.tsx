import { useEffect, useRef, useState } from "react";

/** A link with a Copy button. Shown without the scheme, copied in full. */
export function CopyRow({
  className,
  url,
  pending,
}: {
  className: string;
  url: string | null;
  pending: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className={className}>
      <span>{url ? url.replace(/^https?:\/\//, "") : pending}</span>
      <button
        type="button"
        disabled={!url}
        onClick={async () => {
          if (!url) return;
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1400);
          } catch {
            // Clipboard blocked: the link is still on screen to copy by hand.
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
