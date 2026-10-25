/*
 * Renders public/og.png, the 1200x630 link-preview image.
 * Run from apps/web: bun scripts/og-image.tsx
 *
 * Colors and type follow styles/globals.css and components/landing/landing.css.
 * All text stays inside the centered 1000x500 box so X and WhatsApp crops keep it.
 */
import { Resvg } from "@resvg/resvg-js";
import path from "node:path";
import satori from "satori";

const WIDTH = 1200;
const HEIGHT = 630;
const out = path.join(import.meta.dir, "../public/og.png");

const geist = async (weight: 400 | 500 | 600) => ({
  name: "Geist",
  weight,
  style: "normal" as const,
  data: await Bun.file(
    Bun.fileURLToPath(
      import.meta.resolve(`@fontsource/geist-sans/files/geist-sans-latin-${weight}-normal.woff`),
    ),
  ).arrayBuffer(),
});

const ink = "#242424";

function LogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="3" y="7" width="16" height="5.5" rx="2.75" fill={ink} />
      <rect x="13" y="13.25" width="16" height="5.5" rx="2.75" fill="#2563eb" />
      <rect x="3" y="19.5" width="10" height="5.5" rx="2.75" fill={ink} />
    </svg>
  );
}

function Bubble({ who, text, mine }: { who: string; text: string; mine?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, alignSelf: mine ? "flex-end" : "flex-start" }}>
      {!mine && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 38,
            height: 38,
            borderRadius: 999,
            background: "#f7f7f7",
            border: "1px solid #e6e6e6",
            fontSize: 16,
            fontWeight: 600,
            color: "#6d6e70",
          }}
        >
          {who}
        </div>
      )}
      <div
        style={{
          display: "flex",
          padding: "11px 18px",
          borderRadius: 18,
          fontSize: 21,
          ...(mine
            ? {
                background: "linear-gradient(180deg, #2965ec, #5c89f8)",
                color: "#ffffff",
                boxShadow: "0 2px 10px #4b83fd33",
              }
            : { background: "#ffffff", color: "#3d3d3d", border: "1px solid #efefef" }),
        }}
      >
        {text}
      </div>
    </div>
  );
}

const svg = await satori(
  <div
    style={{
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Geist",
      background: "radial-gradient(ellipse 70% 60% at 50% 0%, #eff6ff, #fdfdfd)",
      color: "#3d3d3d",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 34, fontWeight: 600, color: ink, letterSpacing: "-0.03em" }}>
      <LogoMark size={48} />
      huddle
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 34,
        fontSize: 76,
        fontWeight: 500,
        lineHeight: 1.04,
        letterSpacing: "-0.035em",
        color: ink,
      }}
    >
      <span>Team chat that</span>
      <span
        style={{
          backgroundImage: "linear-gradient(180deg, #2965ec, #5c89f8)",
          backgroundClip: "text",
          color: "transparent",
          paddingBottom: 6,
        }}
      >
        arrives as it's sent
      </span>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 520, marginTop: 40 }}>
      <Bubble who="M" text="Is the fix deployed?" />
      <Bubble who="" text="Live. Everyone in #eng just saw it." mine />
    </div>
  </div>,
  { width: WIDTH, height: HEIGHT, fonts: [await geist(400), await geist(500), await geist(600)] },
);

const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
await Bun.write(out, png);
console.log(` ${path.relative(process.cwd(), out)}  ${(png.length / 1024).toFixed(1)} KB`);
