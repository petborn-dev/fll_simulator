# FLL 3D Simulator — Design Brainstorm

## Context
This is a 3D robotics simulator. The UI is secondary to the 3D viewport — the viewport should dominate the screen. The UI needs to be functional, unobtrusive, and technical-feeling. Think "engineering tool" not "marketing site."

---

<response>
<text>

## Idea 1: Mission Control — Dark Industrial HUD

**Design Movement:** Sci-fi HUD / aerospace mission control interfaces (think SpaceX launch UI, flight simulators)

**Core Principles:**
- Information density without clutter — every pixel serves a purpose
- Dark backgrounds to make the 3D viewport pop
- Monospaced data readouts for a technical, engineering feel
- Minimal chrome — the 3D scene IS the interface

**Color Philosophy:** Deep charcoal (#0D1117) base with electric cyan (#00D4FF) accents for active elements and amber (#FFB800) for warnings/scores. The dark palette ensures the 3D viewport is the visual hero while UI elements glow like instrument panels.

**Layout Paradigm:** Full-bleed 3D viewport with floating, semi-transparent HUD panels overlaid at edges. Top-left: timer/score. Bottom: control bar. Right edge: collapsible tool panel. No traditional page layout — everything floats over the 3D scene.

**Signature Elements:**
- Thin 1px cyan border lines on panels with subtle glow
- Monospaced numeric readouts (JetBrains Mono) for scores, timer, sensor values
- Corner bracket decorations on panels (like targeting reticles)

**Interaction Philosophy:** Panels slide in/out from edges. Hover reveals additional data. Everything feels like operating a control console.

**Animation:** Panels slide with spring physics. Numbers tick up/down with easing. Subtle pulse on active elements.

**Typography System:** JetBrains Mono for data/numbers, Inter for labels, bold weight sparingly for section headers only.

</text>
<probability>0.08</probability>
</response>

---

<response>
<text>

## Idea 2: LEGO Workshop — Warm Tactile Playground

**Design Movement:** Scandinavian toy design meets Material Design 3 — warm, approachable, playful but not childish

**Core Principles:**
- Warm and inviting — this is for kids and mentors, not NASA engineers
- Rounded, tactile UI elements that echo LEGO's physical design language
- Bright accent colors drawn from the LEGO palette (red, yellow, blue, green)
- Clear visual hierarchy for young users

**Color Philosophy:** Warm off-white (#FAF8F5) background with LEGO red (#E3000B) as primary accent, LEGO yellow (#FFD500) for highlights, and soft gray for secondary elements. The warmth says "workshop" not "laboratory."

**Layout Paradigm:** Traditional split-panel layout. Left 70%: 3D viewport with rounded corners and subtle shadow (like a window into the workshop). Right 30%: stacked tool cards. Top: friendly navigation bar with the FLL logo. Clean separation between viewport and tools.

**Signature Elements:**
- Rounded corners (12px+) on all panels, echoing LEGO studs
- Subtle dot-grid pattern on panel backgrounds (like a LEGO baseplate)
- Colorful pill-shaped buttons and badges

**Interaction Philosophy:** Big, obvious click targets. Drag-and-drop where possible. Tooltips explain everything. Designed for a 10-year-old to use without instructions.

**Animation:** Bouncy spring animations on buttons. Cards lift with shadow on hover. Playful but not distracting.

**Typography System:** Nunito Sans for headings (rounded, friendly), Inter for body text. Large font sizes for readability.

</text>
<probability>0.06</probability>
</response>

---

<response>
<text>

## Idea 3: Blueprint Studio — Technical Precision

**Design Movement:** Technical drawing / CAD software aesthetic — precise, grid-based, professional

**Core Principles:**
- Precision and clarity above all — this is an engineering tool
- Blueprint-inspired visual language with grid lines and technical annotations
- Neutral palette that doesn't compete with the 3D scene
- Dense but organized information layout

**Color Philosophy:** Cool gray (#F0F2F5) base with blueprint blue (#2563EB) as primary accent. Dark slate (#1E293B) for text and panel headers. The palette is deliberately restrained — the 3D viewport provides all the color excitement.

**Layout Paradigm:** IDE-style resizable panels. Top toolbar with icon buttons. Left: 3D viewport (resizable). Right: tabbed panel (Controls / Code / Score). Bottom: console/log output. Every panel has a drag handle for resizing. Professional users expect this flexibility.

**Signature Elements:**
- Thin grid lines visible on panel backgrounds (like graph paper)
- Small, precise icons with labels
- Status bar at the bottom showing FPS, physics step count, robot coordinates

**Interaction Philosophy:** Right-click context menus. Keyboard shortcuts for everything. Tab-based navigation between panels. Designed for efficiency and repeat use.

**Animation:** Minimal — fast 150ms transitions. No bouncing or playfulness. Panels resize smoothly. Focus on responsiveness over delight.

**Typography System:** IBM Plex Sans for UI labels (technical, precise), IBM Plex Mono for code and data readouts. Tight line-heights for information density.

</text>
<probability>0.07</probability>
</response>
