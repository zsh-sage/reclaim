# Design System Specification: Luminous Fluidity

## 1. Overview & Creative North Star
**Creative North Star: The Kinetic Workspace**

This design system moves away from the rigid, grid-locked "enterprise" aesthetic and toward a high-end editorial experience. We treat the interface not as a static tool, but as a living environment. By leveraging a **split-screen aesthetic**, we create a permanent anchor of brand identity (using dynamic gradients) against a functional canvas of clean, glassmorphic utility.

The system breaks the "template" look through **intentional asymmetry**. We utilize generous padding (the "breath" of the UI) and overlapping elements to create a sense of depth and motion. This isn't just a software interface; it’s a curated digital workspace designed for clarity, prestige, and focus.

---

## 2. Colors & Surface Philosophy

### The "No-Line" Rule
To achieve a premium, seamless feel, **1px solid borders are strictly prohibited** for sectioning or layout containment. Boundaries must be defined solely through background shifts.
*   Use `surface` (#f5f7f9) as your canvas.
*   Define internal sections using `surface_container_low` (#eef1f3) or `surface_container_high` (#dfe3e6).
*   The contrast between these tonal shifts provides enough visual separation without the "clutter" of lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of frosted glass.
*   **Level 0 (Background):** `surface` (#f5f7f9).
*   **Level 1 (Main Content Containers):** `surface_container_lowest` (#ffffff).
*   **Level 2 (In-app Cards/Sidebars):** `surface_container_low` (#eef1f3).
*   **Level 3 (Popovers/Floating Menus):** `surface_bright` (#f5f7f9) with a 60% opacity backdrop blur.

### The "Glass & Gradient" Signature
For the split-screen anchor and hero elements, use a linear gradient:
*   **Direction:** 135 degrees.
*   **Stops:** `primary` (#4647d3) to `tertiary` (#9e00b4) with a midpoint of `primary_container` (#9396ff).
*   **Glassmorphism:** For elements floating over these gradients, use `surface_container_lowest` at **70% opacity** with a **24px backdrop blur**. This ensures legibility while maintaining the "vibrant" energy of the brand colors.

---

## 3. Typography
The typography scale is designed to bridge the gap between "Corporate Authority" and "Modern Innovation."

*   **Display & Headlines:** We use **Plus Jakarta Sans**. Its geometric clarity and wide stance feel expensive. 
    *   *Usage:* Use `display-lg` (3.5rem) for high-impact landing areas with `-0.02em` letter spacing to feel tighter and more editorial.
*   **Body & Titles:** We use **Inter**. It is the gold standard for legibility in dense data environments.
    *   *Usage:* `body-lg` (1rem) for standard text. Never use pure black; always use `on_surface` (#2c2f31) to maintain a soft, high-end contrast.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering**. Instead of using shadows for every card, place a `surface_container_lowest` card on a `surface_container_low` background. This creates a "soft lift."

### Ambient Shadows
Shadows should feel like natural, ambient light, not digital effects.
*   **Token:** Use `on_surface` (#2c2f31) at **6% opacity**.
*   **Blur:** Minimum **40px to 60px**.
*   **Offset:** Y-axis **8px to 12px**.
*   Avoid sharp, dark shadows; they break the "Luminous Fluidity" ethos.

### The "Ghost Border" Fallback
If a boundary is required for accessibility (e.g., in a high-contrast mode), use a "Ghost Border":
*   **Token:** `outline_variant` (#abadaf) at **15% opacity**.
*   **Width:** 1px.

---

## 5. Component Architectures

### Buttons (Kinetic States)
Buttons are the primary touchpoints of "vibrancy."
*   **Primary:** A gradient from `primary` (#4647d3) to `primary_dim` (#3939c7). Roundedness: `xl` (1.5rem).
*   **Interactive State:** On hover, apply a soft outer glow using `primary_container` at 40% opacity. On click, scale the component to `0.97`.
*   **Tertiary:** No background. Use `primary` text with an underline that appears only on hover.

### Glassmorphic Inputs
*   **Background:** `surface_container_lowest` at 60% opacity.
*   **Blur:** 16px Backdrop-blur.
*   **States:** On focus, the `outline` (#747779) transitions to `primary` (#4647d3) with a 4px outer "aura" of the same color at 10% opacity.

### Cards & Lists
*   **No Dividers:** Forbid the use of divider lines in lists. 
*   **The Spacing Method:** Use 24px (1.5rem) vertical padding between list items. Use a `surface_container_highest` (#d9dde0) background on hover to define the selection.
*   **Roundedness:** All cards and containers must use the `xl` (1.5rem) or `lg` (1rem) tokens. Never use "none" or "sm" for structural elements.

### Chips & Badges
*   Use `secondary_container` (#a4d8ff) with `on_secondary_container` (#004c6f) for a "Cool Enterprise" look.
*   Roundedness: `full` (9999px) to contrast with the `xl` roundedness of cards.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts. For example, a 60/40 split screen where the 60% side has generous `3rem` padding.
*   **Do** use `primary_fixed` and `tertiary_fixed` for accent highlights in data visualization.
*   **Do** prioritize whitespace. If a screen feels "busy," increase the padding rather than adding lines.

### Don't:
*   **Don't** use 100% opaque, high-contrast borders. It kills the "Glassmorphism" effect.
*   **Don't** use standard "Drop Shadows" (0,0,5,0). Always use large, diffused, tinted ambient shadows.
*   **Don't** mix the `display` font (Plus Jakarta Sans) with body text. Keep the display font for "moments" and headlines only.
*   **Don't** use the `error` color (#b41340) for anything other than critical alerts. For "vibrant" warnings, use the `tertiary` range.