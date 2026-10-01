# AGENTS.md — Ka-Lakbay Design System

> Agents and LLMs: follow these rules when writing, reviewing, or refactoring any UI in this repo.

---

## 1. Product identity

| Fact | Value |
|---|---|
| App name | **Ka-Lakbay** |
| Mascot | **Lory**: a cheerful, whimsical female parrot. Orange-red body, blue and yellow wings/tail, blue hoodie and sneakers. Guide and companion, never an authority. (Any "Lio" in older notes is a typo. Use **Lory**.) |
| Purpose | AI-powered student career and learning navigator |
| Core loop | Discover → Diagnose → Map → Learn → Prove → Reassess |
| Audience | Students (not schools, teachers, or admins) |

### Product guardrails (affect UI copy and layout)

- **Not** a job board, resume builder, course marketplace, generic chatbot, career quiz, or LMS. Do not build screens for those.
- The AI **suggests possible paths**. It never decides a student's career. Use: *career path, possible path, alignment, explore, relevant to you, skills to develop*. Avoid: *match, best career, you should become, guaranteed*.
- Resume upload is **optional**. Every flow must work fully with "Skip for now".
- Every place that collects data explains **why** it is collected. AI involvement is always visible (label AI-generated content).
- Never imply recommendations are guaranteed outcomes.
- Track what the student can **demonstrate**, not only what they consumed. Finishing a resource does not equal mastery.
- Support English and Filipino copy. Keep strings out of JSX where practical so they can be translated.

---

## 2. Color system

**Direction: Notion-like layout with pastel color.** White canvas, neutral borders, quiet text. Color comes from the Ka-Lakbay palette, used mostly as soft tints, with full-strength color reserved for actions and highlights. Not a dark theme. Dark mode is out of scope for the MVP.

### 2.1 Neutrals (about 85–90% of every screen)

| Token | HSL | Hex | Usage |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Page canvas |
| `--foreground` | `0 0% 4%` | `#0A0A0A` | Primary text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Cards (separated by border, not fill) |
| `--card-foreground` | `0 0% 4%` | `#0A0A0A` | Card text |
| `--muted` | `60 11% 96%` | `#F7F7F5` | Subtle surfaces, hover rows, sidebars |
| `--muted-foreground` | `0 0% 42%` | `#6B6B6B` | Secondary text (5.3:1 on white) |
| `--border` / `--input` | `60 4% 91%` | `#E9E9E7` | Dividers, input borders |

### 2.2 Palette (from the design board)

The palette is fixed. Do not add, shift, or substitute colors.

| Token | Board name | Hex | HSL | Role |
|---|---|---|---|---|
| `--lory-blue` | **Kind Berry** | `#1F6BED` | `218 85% 53%` | **Main accent.** Primary buttons, links, focus rings, selected and active states |
| `--lory-yellow` | **Mellow** | `#F4FF1E` | `63 100% 56%` | **Main accent.** Highlights, current step, "you are here", streaks. Fill only, never text on white |
| `--lory-pink` | **Flossy** | `#FF7FAB` | `339 100% 75%` | Soft accent. Tinted surfaces, tags, early-progress states |
| `--lory-hot-pink` | **Hot Pink** (warm) | `#FF4283` | `339 100% 63%` | Small attention accents, notification dots, badges |
| `--lory-magenta` | **Hot Pink** (electric) | `#FF1EC7` | `315 100% 56%` | Rare. Gradient stops and celebratory moments |
| `--lory-green` | **Green House** | `#116B09` | `115 84% 23%` | Success |
| `--lory-burgundy` | **Velvet Cherry** | `#6E1221` | `350 72% 25%` | Destructive and error |

**Not in the palette (do not use, do not create tokens):** Taffy `#E76290`, Blue Vinyl `#0759A2`.

**Hierarchy:** Kind Berry and Mellow are the brand pair and lead every screen. Flossy, the two Hot Pinks, Green House, and Velvet Cherry are supporting accents in small doses. Never put more than three palette colors on one screen region.

### 2.3 Semantic mapping

| shadcn token | Value |
|---|---|
| `--primary` | `--lory-blue` |
| `--primary-foreground` | `0 0% 100%` |
| `--secondary` | `--muted` |
| `--accent` | `--lory-yellow` at low alpha for hover and highlight surfaces |
| `--ring` | `--lory-blue` |
| `--success` | `--lory-green` |
| `--destructive` | `--lory-burgundy` |
| `--destructive-foreground` / `--success-foreground` | `0 0% 100%` |

### 2.4 Pastel tint recipe

The board colors are saturated. To get the pastel feel, use them as translucent tints on surfaces and keep solid color for small, important elements.

| Use | Tint | Text on it |
|---|---|---|
| Info / selected surface | `bg-lory-blue/10` | `text-foreground` |
| Highlight / current step surface | `bg-lory-yellow/30` | `text-foreground` |
| Soft tag / early-progress surface | `bg-lory-pink/20` | `text-foreground` |
| Attention surface | `bg-lory-hot-pink/10` | `text-foreground` |
| Success surface | `bg-lory-green/10` | `text-lory-green` |
| Error surface | `bg-lory-burgundy/10` | `text-lory-burgundy` |

Tailwind alpha modifiers only work if colors are registered as `hsl(var(--token) / <alpha-value>)` in `tailwind.config.ts`.

### 2.5 Contrast rules (light base)

| Pair | Ratio | Rule |
|---|---|---|
| White on Kind Berry | 4.8:1 | OK for buttons and body-size text |
| Kind Berry on white | 4.8:1 | OK for links. On `--muted` (`#F7F7F5`) it drops to about 4.5:1, so use bold or larger text there |
| Foreground (`#0A0A0A`) on Mellow | about 18:1 | The only correct text on Mellow |
| Mellow on white | 1.1:1 | **Never** as text, icon, or border on white. Fill and highlighter only |
| Mellow on Kind Berry | 4.4:1 | Large Knewave headlines only |
| Foreground on Flossy | about 9:1 | OK |
| White on Flossy | 2.4:1 | **Never** |
| White on either Hot Pink | about 3.3:1 | Large or bold text only. Never as pink text on white |
| White on Green House / Velvet Cherry | 6.7:1 / 11.9:1 | OK |
| Foreground on Kind Berry | 4.1:1 | Do not use. Pair Kind Berry with white |

### 2.6 Color rules

- **Never** use raw Tailwind colors (`bg-blue-500`) or raw hex in components. Use semantic tokens (`bg-primary`, `text-lory-blue`).
- Status colors go through semantic tokens or badge variants.
- **Color alone must not communicate meaning.** Pair it with text or an icon (especially skill levels and success/error).
- Text contrast: 4.5:1 normal, 3:1 large (18px+ or 14px+ bold).
- Gradients: Kind Berry → Flossy or Flossy → Hot Pink only, and only for hero and celebratory moments.
- The mascot's orange-red is part of the Lory illustration, not a UI token. Do not recolor UI to match it.

---

## 3. Typography

| Role | Font | CSS variable | Class |
|---|---|---|---|
| Display / headlines | **Knewave** (retro comic / gaming) | `--font-display` | `font-display` |
| Body / UI text | **Space Grotesk** | `--font-body` | `font-body` (default on `<body>`) |
| Data / mono | **IBM Plex Mono** | `--font-mono` | `font-mono` |

### Rules

- Headlines and hero text: `font-display`. **Knewave has a single weight.** Use `font-normal`, never `font-bold` or `font-semibold` (the browser would fake it).
- Body, labels, paragraphs, buttons: `font-body`.
- Numeric data, scores, tabular values: `font-mono`.
- **Never** use all-caps for labels.
- **Never** accent a single word in a headline with a different color unless it is an intentional brand moment (e.g. `<span className="text-lory-blue">direction</span>` in the hero).
- Line length: max 80 characters for body copy (`max-w-md` for hero, `max-w-2xl` for section intros).
- Keep Knewave out of long text, small sizes (under 18px), and dense UI like tables and form labels.

### Type scale

| Element | Class |
|---|---|
| Hero H1 | `font-display font-normal text-5xl md:text-7xl` |
| Section H2 | `font-display font-normal text-3xl md:text-4xl` |
| Card H3 | `font-display font-normal text-lg` |
| Body | `text-base` / `text-lg`, `text-foreground` or `text-muted-foreground` |
| Small / meta | `text-sm` / `text-xs`, `text-muted-foreground` |

---

## 4. Voice and copy

Two voices. Do not mix them.

**UI voice** (buttons, labels, errors, empty states, settings): plain verbs, sentence case, active voice, no filler.
Example: "Start my journey", "Skip for now", "Upload resume".

**Lory voice** (chat bubbles, tooltips, reactions, empty-state companion lines): cheerful and whimsical, with occasional casual study-buddy humor. Never childish, never a decision-maker.
Examples: "Nice! That tells me a little more about you." / "Okay, we found a skill gap. No panic, that's literally what we're here for."

Rules:
- Lory may explain, encourage, and ask. Lory never says "you should be a ___".
- Use *alignment*, not *match*. Show a reason next to every alignment percentage.
- Lory says there are no wrong answers and that questions can be skipped. Make "skip" and "I'm not sure yet" available in the interview.
- Label AI-generated content ("Lory suggests", "AI-generated").

---

## 5. Spacing and layout

- **Container**: `mx-auto max-w-5xl px-6`.
- **Section vertical padding**: `py-16 md:py-20`; hero: `py-24 md:py-32`.
- **Separators**: `border-b border-border`. Notion-like means borders and whitespace, not heavy shadows.
- **Cards**: `rounded-xl border border-border bg-card`. Hover may add a faint tinted ring, never a dark shadow.
- **Grid gaps**: `gap-4` for cards, `gap-px bg-border` for dense grids.
- **Use `gap-*` over `space-x-*` / `space-y-*`.**
- **Use `size-*` over `w-* h-*`** when equal.
- Mobile-first. Design at 375px first.

---

## 6. Components

### 6.1 Existing shadcn/ui (extended)

| File | Key additions |
|---|---|
| `components/ui/button.tsx` | `loryBlue` (primary) and `loryYellow` (highlight, dark text) variants via `cva` |
| `components/ui/card.tsx` | `rounded-xl`, border, tinted hover ring |
| `components/ui/input.tsx` | `focus-visible:ring-lory-blue` |

### 6.2 Custom components

| File | Purpose | Key props |
|---|---|---|
| `components/lory-avatar.tsx` | Animated mascot | `state`: `idle \| thinking \| happy \| confused`; `size`: `sm \| md \| lg`; `animate` |
| `components/progress-bar.tsx` | Gel-like progress fill | `value`, `max`, `variant`: `default \| gel \| gradient`, `label` |
| `components/skill-badge.tsx` | Skill proficiency badge | `skill`, `level`: `not-assessed \| started \| developing \| demonstrated \| strong` |
| `components/career-card.tsx` | Career exploration card | `title`, `alignmentPercent`, `reason`, `isSaved`, `onSave`, `onClick` |
| `components/chat-message.tsx` | Interview and help chat bubble | `sender`: `lory \| user`, `message`, `isTyping`, `timestamp`, `options?` |
| `components/roadmap-step.tsx` | Learning level | `level` (e.g. "Level 01"), `title`, `activities`, `proof`, `isCompleted`, `isCurrent` |
| `components/mascot-reaction.tsx` | Floating mascot + message | `state`, `message`, `showBadge` |

### 6.3 Components to add (from the MVP screen list)

| File | Purpose |
|---|---|
| `components/student-profile.tsx` | Readable profile: program, year, interests, strengths, developing, unassessed. No opaque AI score |
| `components/skill-gap-map.tsx` | Career skills vs the student's status (skill, level badge, short note) |
| `components/resume-upload.tsx` | Optional upload with consent copy and a "Skip for now" button of equal prominence |
| `components/lost-button.tsx` | "I'm Lost" entry point to exploratory questions |
| `components/lory-help-chat.tsx` | Persistent help chat grounded in the student's profile and roadmap |
| `components/learning-activity.tsx` | One-concept micro-learning card: learn one thing, try one example, do one challenge |
| `components/proof-challenge.tsx` | Skill challenge / project submission that updates demonstrated skills |
| `components/ai-disclosure.tsx` | "Why we ask" and "AI-generated" labels |
| `components/language-toggle.tsx` | English / Filipino switch |

`streak-counter.tsx` exists but is **not in context.md or the MVP screen list**. Do not surface it in the demo unless the user asks for it.

### 6.4 Skill level styling

Color is never the only signal. Every level shows its text label.

| Level | Surface | Text |
|---|---|---|
| `not-assessed` | `bg-muted`, dashed border | `text-muted-foreground` |
| `started` | `bg-lory-pink/20` | `text-foreground` |
| `developing` | `bg-lory-yellow/30` | `text-foreground` |
| `demonstrated` | `bg-lory-blue/10` | `text-lory-blue` |
| `strong` | `bg-primary` | `text-primary-foreground` |

### 6.5 Usage rules

1. Use **built-in variants first**, then `className` for layout only, then add a `cva` variant.
2. **Never** override colors via `className`. Use semantic tokens or add a variant.
3. Use `cn()` for conditional classes.
4. Do **not** add manual `z-50` on overlay components (Dialog, Sheet, etc.).
5. Use the `shimmer` utility for loading states, not custom `@keyframes`.
6. No `space-x-*` / `space-y-*`. Use `gap-*`.
7. Prefer `truncate` shorthand.

---

## 7. Animation system

The brief asks for smooth, liquid / gel-like, game-like motion. The rules below keep that without turning it into decoration.

### Hybrid approach

| Layer | Tool | Used for |
|---|---|---|
| Simple states | **CSS / Tailwind** | Hover, focus, `transition-colors` |
| Complex motion | **Framer Motion** | Mascot float, spring entrances, step transitions, stagger |

### Motion vocabulary

| Effect | Where | Implementation |
|---|---|---|
| **Float** | LoryAvatar idle | `animate-lory-float` (4s) |
| **Stagger** | Section entrances, grids | `staggerChildren: 0.15` |
| **Spring** | Badge pop, avatar bounce | `type: "spring", damping: 10-20` |
| **Press feedback** | Buttons, cards | `whileTap={{ scale: 0.98 }}` |
| **Pop in** | Lory state change | `scale: [0, 1.3, 1]` |
| **Layer jump** | Sign-up and interview step transitions | Outgoing content fades and shrinks, next layer springs up (transform + opacity) |
| **Shimmer** | Loading | `.shimmer` utility |
| **Progress fill** | Progress bar | Animate `scaleX` with `transform-origin: left` (never `width`) |
| **Scroll reveal** | Sections | `whileInView` |

### Motion rules

- **Purposeful only**: motion must orient, give feedback, or show relationships.
- **One orchestrated moment per page** (the hero entrance). Layer-jump transitions in the sign-up and interview flow count as navigation feedback, not extra decoration.
- **Reduced motion**: honor `prefers-reduced-motion`. Replace motion with instant or opacity-only changes.
- **No blocking**: content must be visible and usable without animation.
- **Animate `transform` and `opacity` only.**
- **Frequency rule**: the more often users see an animation, the shorter it is.

### Keyframes (`tailwind.config.ts`)

```css
lory-float:  translateY(0→-8px) + rotate(-2°→2°), 4s ease-in-out infinite
gel-wiggle:  scale(1→1.02) + rotate, 6s ease-in-out infinite
shimmer:     translateX(-100%→200%), 1.8s ease-in-out infinite
```

---

## 8. Vercel React best practices

| Rule | Applied in |
|---|---|
| `bundle-barrel-imports`: import directly, avoid barrel files | All components |
| `rendering-hoist-static-jsx`: static JSX outside components | Career and loop data as module-level consts |
| `rerender-no-inline-components` | All components at module level |
| `rendering-conditional-render`: ternary, not `&&` | Conditional rendering |
| `server-hoist-static-io` | Fonts in `layout.tsx` via `next/font` |
| `rerender-functional-setstate` | State updates use functional form |
| Animate wrapper div, not SVG | LoryAvatar wraps SVG in `motion.div` |

- Components using hooks or stateful animation need `"use client"`.
- Prefer CSS transitions for simple hover and focus.
- Use `whileInView` instead of scroll listeners.

---

## 9. Accessibility

- Focus ring: `focus-visible:ring-2 focus-visible:ring-lory-blue focus-visible:ring-offset-2`.
- Touch targets: min 44×44px. Use `size-11` (not `size-10`, which is 40px).
- Contrast: see section 2.5. Re-check any new color pairing.
- Color never alone for meaning. Pair with icon or text.
- All interactive elements reachable via Tab, with visible focus.
- `prefers-reduced-motion` respected.
- Chat and AI output regions use `aria-live="polite"`.
- Accessible typography matters for the hackathon bonus: no Knewave in small or dense text.

---

## 10. File conventions

```
components/
├── ui/                    # shadcn primitives (button, card, input, label)
├── lory-avatar.tsx        # custom components: kebab-case, one per file
├── ...
lib/
├── constants.ts           # color tokens, shared types (LoryState, SkillLevel, durations)
├── utils.ts               # cn() utility
app/
├── globals.css            # ALL CSS variables go here, never a new CSS file
├── layout.tsx             # fonts loaded via next/font/google
tailwind.config.ts         # colors (hsl(var(--x) / <alpha-value>)), keyframes, animations
```

- **One component per file**, named export (not default).
- `React.forwardRef` for DOM-targeting components, with `displayName` set.
- `cva` for variant-driven styling.
- Props interfaces exported alongside components: `export interface XProps`.

---

## 11. Commands

```bash
npm run dev         # dev server at localhost:3000
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

Run `typecheck` and `lint` before considering any UI task complete.

---

## 12. Design contract (for new screens)

Before building a new screen, confirm:

1. **Purpose**: persuade / operate / read / experience. Does it support the core loop? If not, don't build it.
2. **First viewport**: communicates the task immediately with one obvious next action.
3. **Color**: white and neutral base, Kind Berry as the action color, Mellow for highlights, other palette colors as small tints.
4. **Type**: Knewave (single weight) for headlines, Space Grotesk for body, IBM Plex Mono for data.
5. **Copy**: UI voice for controls, Lory voice for companion text. "Alignment", not "match".
6. **Privacy and AI**: say why data is collected, label AI content, keep resume optional.
7. **Motion**: one orchestrated entrance, tap feedback, reduced motion respected.
8. **States**: loading, empty, error, disabled, success, all implemented.
9. **Responsive**: tested at 375px, 768px, 1280px.

**MVP screens** (from context.md): landing, login/sign-up, AI introduction, AI interview, optional resume upload, student profile, career cards, career detail, skill-gap view, personalized roadmap, micro-learning activity, skill challenge / proof, updated progress.

**Verify**: run `npm run typecheck && npm run lint`, then check at 375px and 1280px.

---

## 13. Open decisions (confirm with the user, then delete this section)

1. **Skill levels**: context.md lists Beginner (section 13) and Started / Demonstrated (section 16). This file uses `not-assessed | started | developing | demonstrated | strong`. Confirm.
2. **CTA casing**: context.md writes "Start My Journey" (title case); the UI voice rule is sentence case ("Start my journey"). Confirm.
3. **Hot Pink**: the board has two. `--lory-hot-pink` (`#FF4283`) is the default; `--lory-magenta` (`#FF1EC7`) is reserved for rare moments. Confirm.
4. **Streak counter**: keep, hide, or remove from the MVP.
