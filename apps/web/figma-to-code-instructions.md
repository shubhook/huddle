# Huddle - Figma-to-Code Build Instructions

You are implementing the Huddle frontend from Figma designs that have already been imported. Your job is to read the Figma structure exactly and translate it into clean, modular React code — not to reinterpret or improve the design. Match what's in Figma precisely: spacing, colors, type sizes, corner radii, component states.

---

## Before writing any code

1. Read the Figma frame provided (via selection or node link) using the Figma MCP tool
2. Extract exact values — don't approximate. Pull real hex codes, real px values for spacing/radius/font-size, real font families and weights directly from the Figma node data
3. Identify repeated patterns across the frame — if the same button style appears 4 times, that's one component, not four inline styles
4. State back a short plan before coding: which components you're extracting, and the prop shape you intend for each. Wait for confirmation only if something is ambiguous — otherwise proceed

---



## Stack (already established — do not deviate)

- Bun runtime, `Bun.serve()` with HTML imports — no Vite
- React 19 + TypeScript, strict mode
- Tailwind CSS v4
- shadcn/ui primitives, copied in manually (not via CLI) into `src/components/ui/`
- lucide-react for icons
- No Zustand, no react-router — Context + hash-based routing only

---



## File structure — mandatory, one component per file

```
apps/web/src/
├── components/
│   ├── ui/                      — shadcn primitives only (Button, Input, Badge, Avatar, Tabs, Separator, Dialog)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── WorkspaceSwitcher.tsx
│   ├── auth/
│   │   ├── SignupForm.tsx
│   │   ├── SigninForm.tsx
│   │   └── AuthCard.tsx          — shared card wrapper used by both forms
│   ├── chat/
│   │   ├── MessageFrame.tsx       — the signature message component, built once
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   ├── EmptyChannelState.tsx
│   │   └── ConnectionBadge.tsx
│   ├── workspace/
│   │   ├── CreateWorkspaceModal.tsx
│   │   ├── InviteLinkPanel.tsx
│   │   └── JoinWorkspaceScreen.tsx
│   └── landing/
│       ├── Hero.tsx
│       ├── FeatureGrid.tsx
│       ├── FeatureCard.tsx
│       ├── ArchitecturePanel.tsx
│       ├── StatsRow.tsx
│       └── Footer.tsx
├── pages/
│   ├── LandingPage.tsx           — composes Hero, FeatureGrid, ArchitecturePanel, Footer
│   ├── SignupPage.tsx
│   ├── SigninPage.tsx
│   └── DashboardPage.tsx         — composes Sidebar, TopBar, MessageList, MessageInput
├── styles/
│   └── globals.css               — CSS variables + Tailwind + font imports, extracted from Figma
├── types/
│   └── index.ts
└── lib/
    └── utils.ts                  — cn() helper, shared formatting functions
```

**Rule: no component file exceeds ~150 lines.** If a component grows past that, it's doing too much — split it (e.g., `MessageFrame.tsx` should not also contain the grouping logic for consecutive messages; that logic lives in `MessageList.tsx`, which just decides *when* to render a full frame vs. a collapsed one).

**Rule: every component gets a typed props interface, declared directly above the component, named** `{ComponentName}Props`**.**

```tsx
interface MessageFrameProps {
  sender: string;
  timestamp: string;
  content: string;
  isGrouped: boolean;
}

export function MessageFrame({ sender, timestamp, content, isGrouped }: MessageFrameProps) {
  // ...
}
```

---



## Design token extraction

Before building any component, first build `styles/globals.css` with CSS variables pulled directly from Figma's color styles and text styles panel — not guessed. If Figma has named color styles (e.g., "ink/primary", "signal/online"), use those exact names as your CSS variable names, translated to kebab-case:

```css
:root {
  --ink: #0A0A0B;
  --paper: #FFFFFF;
  --surface: #FAFAFA;
  --hairline: #E4E4E7;
  --signal: #22C55E;
  /* ...pull every value actually used in the Figma file, don't invent extras */
}
```

Then extend `tailwind.config` (or the CSS-based `@theme` block in Tailwind v4) to reference these variables so components use `bg-ink`, `border-hairline`, etc. — not raw hex codes scattered through JSX.

---



## Component-by-component build order

Build in this order — each step's components become dependencies for the next:

### Step 1 — Primitives (`components/ui/`)

Pull Button, Input, Badge, Avatar, Tabs, Separator, Dialog from Figma's component set if one exists. Match every state visible in Figma: default, hover, focus, disabled, active. If Figma only shows the default state for something, infer hover/focus from the rest of the design system's conventions (don't invent a new visual language for missing states).

### Step 2 — Layout shell

`Navbar.tsx` (landing), `Sidebar.tsx` + `TopBar.tsx` (dashboard). These are structural — get the exact spacing and breakpoints from Figma's auto-layout properties.

### Step 3 — The signature: `MessageFrame.tsx`

This is the most important component. Read its anatomy directly from Figma:

- What exactly is in the metadata strip (sender, timestamp, channel)?
- Exact border radius, border color, padding from the Figma node
- How does the "grouped" (collapsed) state differ visually from the full state? Figma should show both variants — implement both, driven by the `isGrouped` prop, not two separate components



### Step 4 — Auth screens

`SignupForm.tsx`, `SigninForm.tsx`, sharing `AuthCard.tsx` for the wrapper. Match input states (default/error/focus) exactly as shown in Figma variants.

### Step 5 — Landing page sections

Build each section (`Hero`, `FeatureGrid`, `ArchitecturePanel`, `StatsRow`, `Footer`) as isolated components, then compose them in `LandingPage.tsx` in the same vertical order as the Figma frame.

### Step 6 — Dashboard / Chat

`MessageList.tsx` (handles grouping logic + scroll behavior), `MessageInput.tsx`, `ConnectionBadge.tsx`, `EmptyChannelState.tsx`. Compose into `DashboardPage.tsx`.

### Step 7 — Workspace flows

`CreateWorkspaceModal.tsx`, `InviteLinkPanel.tsx`, `JoinWorkspaceScreen.tsx`.

---



## What "match exactly" means in practice

- If Figma shows a button at 44px height with 16px horizontal padding and 8px radius — use those exact values, not `py-2 px-4 rounded-md` guessed from memory
- If Figma's type scale shows the hero headline at 64px with -0.03em tracking — use that exact size and tracking, don't round to a Tailwind default like `text-6xl` unless it happens to match
- Copy the exact copy/microcopy text from Figma if it's present in the design — don't paraphrase button labels or headlines



## What you should NOT copy literally

- Static states shown in the design (e.g., a hardcoded "3 online" count, a placeholder username like "Alice") — wire these to real data from props/API, using the Figma value only as a formatting reference
- Any dummy image or avatar photo used as a Figma placeholder — replace with the initials-based Avatar component per the existing design system

---



## After building each screen

1. Run the dev server and take a screenshot if your environment supports it
2. Compare side-by-side against the Figma frame — check spacing, alignment, font rendering
3. Fix any drift before moving to the next screen — don't let small inconsistencies compound across 6 screens

---



## Definition of done

Every screen listed in Step 1–7 exists as composed pages in `src/pages/`, built entirely from components in `src/components/`, with no inline one-off styling duplicating what a shared component already handles. The dashboard and chat UI should visually match the landing page's message-frame mockup exactly — same component, same file, reused.