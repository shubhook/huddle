import { useEffect, useRef } from "react";

export function HowItWorks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      const nextW = Math.floor(cssW * dpr);
      const nextH = Math.floor(cssH * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const ink = "#243040";
      const brand = "#4a6a86";
      const muted = "#93a1af";
      const paper = "#fcfdfe";
      const line = "#d3dde7";

      const sender = { x: cssW * 0.14, y: cssH * 0.5 };
      const hub = { x: cssW * 0.42, y: cssH * 0.5 };
      const clients = [
        { x: cssW * 0.78, y: cssH * 0.22, label: "client 1" },
        { x: cssW * 0.82, y: cssH * 0.5, label: "client 2" },
        { x: cssW * 0.78, y: cssH * 0.78, label: "client 3" },
      ] as const;

      const wire = (
        a: { x: number; y: number },
        b: { x: number; y: number },
      ) => {
        ctx.beginPath();
        ctx.moveTo(a.x + 34, a.y);
        ctx.lineTo(b.x - 34, b.y);
        ctx.strokeStyle = line;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      wire(sender, hub);
      for (const client of clients) wire(hub, client);

      const t = reduced ? 0.55 : (frame % 180) / 180;
      const packet = (
        a: { x: number; y: number },
        b: { x: number; y: number },
        p: number,
      ) => {
        const x = a.x + 34 + (b.x - 34 - (a.x + 34)) * p;
        const y = a.y + (b.y - a.y) * p;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = brand;
        ctx.fill();
      };

      if (t < 0.35) {
        packet(sender, hub, t / 0.35);
      } else {
        const p = (t - 0.35) / 0.65;
        for (const client of clients) packet(hub, client, p);
      }

      const node = (x: number, y: number, label: string) => {
        ctx.beginPath();
        ctx.roundRect(x - 34, y - 16, 68, 32, 8);
        ctx.fillStyle = paper;
        ctx.fill();
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.font = "500 11px Figtree, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x, y);
      };

      node(sender.x, sender.y, "sender");
      node(hub.x, hub.y, "Map room");
      for (const client of clients) {
        node(client.x, client.y, client.label);
      }

      ctx.fillStyle = muted;
      ctx.font = "500 10px IBM Plex Mono, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("fan-out after persist", 16, 22);

      if (!reduced) {
        frame += 1;
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    const onResize = () => {
      if (reduced) draw();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section id="how-it-works" className="relative w-full bg-paper px-5 py-24">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-brand-600">
          Under the hood
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-medium tracking-tight text-ink sm:text-[2.25rem]">
          What you are actually looking at
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-text-muted">
          Bun, Express, Postgres, and the{" "}
          <code className="font-mono text-[13px]">ws</code> library. Redis sits
          in Compose unused. Presence is not built. The diagrams below are the
          real path.
        </p>

        <div className="mt-12 overflow-hidden rounded-2xl border border-hairline bg-surface/40">
          <div className="border-b border-hairline px-5 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-placeholder">
              message path
            </p>
          </div>
          <div className="overflow-x-auto px-4 py-8 sm:px-8">
            <svg
              viewBox="0 0 720 160"
              className="mx-auto h-auto min-w-[560px] w-full max-w-3xl"
              role="img"
              aria-label="Browser connects with cookie, server writes to Postgres, then fans out over WebSocket"
            >
              <defs>
                <marker
                  id="hiw-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#93a1af" />
                </marker>
              </defs>

              <rect
                x="16"
                y="48"
                width="120"
                height="48"
                rx="10"
                fill="#fcfdfe"
                stroke="#d3dde7"
              />
              <text
                x="76"
                y="70"
                textAnchor="middle"
                fill="#243040"
                fontFamily="Figtree,sans-serif"
                fontSize="13"
                fontWeight="600"
              >
                Browser
              </text>
              <text
                x="76"
                y="88"
                textAnchor="middle"
                fill="#5c6b7a"
                fontFamily="IBM Plex Mono,monospace"
                fontSize="10"
              >
                cookie JWT
              </text>

              <line
                x1="136"
                y1="72"
                x2="198"
                y2="72"
                stroke="#b7c5d3"
                strokeWidth="1.5"
                markerEnd="url(#hiw-arrow)"
              />
              <text
                x="167"
                y="62"
                textAnchor="middle"
                fill="#93a1af"
                fontFamily="IBM Plex Mono,monospace"
                fontSize="9"
              >
                upgrade
              </text>

              <rect
                x="200"
                y="48"
                width="130"
                height="48"
                rx="10"
                fill="#fcfdfe"
                stroke="#d3dde7"
              />
              <text
                x="265"
                y="70"
                textAnchor="middle"
                fill="#243040"
                fontFamily="Figtree,sans-serif"
                fontSize="13"
                fontWeight="600"
              >
                Express + ws
              </text>
              <text
                x="265"
                y="88"
                textAnchor="middle"
                fill="#5c6b7a"
                fontFamily="IBM Plex Mono,monospace"
                fontSize="10"
              >
                auth on open
              </text>

              <line
                x1="330"
                y1="72"
                x2="392"
                y2="72"
                stroke="#b7c5d3"
                strokeWidth="1.5"
                markerEnd="url(#hiw-arrow)"
              />
              <text
                x="361"
                y="62"
                textAnchor="middle"
                fill="#93a1af"
                fontFamily="IBM Plex Mono,monospace"
                fontSize="9"
              >
                insert
              </text>

              <rect
                x="394"
                y="48"
                width="120"
                height="48"
                rx="10"
                fill="#fcfdfe"
                stroke="#d3dde7"
              />
              <text
                x="454"
                y="70"
                textAnchor="middle"
                fill="#243040"
                fontFamily="Figtree,sans-serif"
                fontSize="13"
                fontWeight="600"
              >
                Postgres
              </text>
              <text
                x="454"
                y="88"
                textAnchor="middle"
                fill="#5c6b7a"
                fontFamily="IBM Plex Mono,monospace"
                fontSize="10"
              >
                durable first
              </text>

              <line
                x1="265"
                y1="96"
                x2="265"
                y2="118"
                stroke="#b7c5d3"
                strokeWidth="1.5"
              />
              <line
                x1="265"
                y1="118"
                x2="580"
                y2="118"
                stroke="#b7c5d3"
                strokeWidth="1.5"
                markerEnd="url(#hiw-arrow)"
              />
              <text
                x="420"
                y="110"
                textAnchor="middle"
                fill="#4a6a86"
                fontFamily="IBM Plex Mono,monospace"
                fontSize="9"
              >
                then broadcast
              </text>

              <rect
                x="580"
                y="94"
                width="120"
                height="48"
                rx="10"
                fill="#eef3f7"
                stroke="#c5d6e6"
              />
              <text
                x="640"
                y="116"
                textAnchor="middle"
                fill="#243040"
                fontFamily="Figtree,sans-serif"
                fontSize="13"
                fontWeight="600"
              >
                Channel Map
              </text>
              <text
                x="640"
                y="134"
                textAnchor="middle"
                fill="#5c6b7a"
                fontFamily="IBM Plex Mono,monospace"
                fontSize="10"
              >
                Set&lt;WebSocket&gt;
              </text>
            </svg>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-surface/40">
          <div className="border-b border-hairline px-5 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-placeholder">
              live fan-out
            </p>
          </div>
          <canvas
            ref={canvasRef}
            className="block h-[220px] w-full bg-paper/60"
            aria-label="Animated fan-out from a channel room map to connected clients"
          />
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">
              Cookie on upgrade
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
              The browser opens a socket. The JWT rides in the cookie. No
              special headers.
            </p>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">
              Rooms as a Map
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
              Each channel is a set of live sockets in memory. Honest about what
              breaks at two servers.
            </p>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">
              Write, then fan out
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
              Postgres gets the message first. Then everyone joined to that
              channel sees it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
