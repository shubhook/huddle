/** Chat-transcript mark. Blue is the message that just landed. */
export function LogoMark({ on = "light" }: { on?: "light" | "dark" }) {
  const them = on === "dark" ? "#f1f1ef" : "#242424";
  return (
    <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden>
      <rect x="3" y="7" width="16" height="5.5" rx="2.75" fill={them} />
      <rect x="13" y="13.25" width="16" height="5.5" rx="2.75" fill="#2563eb" />
      <rect x="3" y="19.5" width="10" height="5.5" rx="2.75" fill={them} />
    </svg>
  );
}
