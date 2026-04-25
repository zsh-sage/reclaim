# SYSTEM PROMPT: RECLAIM DECK TWEAKS (SLIDES 2, 3, 5)

You are an expert frontend engineer. Refine the specific HTML/CSS for Slides 2, 3, and 5 of my deck based on these strict instructions. Use only CSS and inline SVGs. Do not use external libraries. Maintain the existing color variables (`--p`, `--ok`, `--warn`, `--err`, `--t`).

## 1. SLIDE 2: THE PROBLEM (Update)
**Current State:** 5 animated lines merging into a bottleneck.
**The Fix:** We need to show the origin of the bottleneck. 
* Add a minimal, monoline SVG representing an "Employee" on the far left.
* Animate an SVG "Document" moving from the Employee to the start of the 5 horizontal lines. 
* The flow must read visually as: Employee (Static SVG) -> Submits Document (Animated SVG moving right) -> Hits the 5-line high-volume queue -> Crashes into the HR Bottleneck (Red).

## 2. SLIDE 3: THE SOLUTION (Update)
**Current State:** 3 columns (Bucket A, Bucket B, Fraud Trap) with a quote at the bottom.
**The Fix:** We need to explicitly brand this solution as "Reclaim" bridging the gap.
* Above the 3 columns, add a dynamic, glowing header or central SVG node labeled **"THE RECLAIM ENGINE"** (using the `--p` primary color and `grad-text` class).
* Visually connect this "Reclaim Engine" header to the 3 buckets below it using faint, animated SVG connecting lines (to show Reclaim routing the claims into the buckets).

## 3. SLIDE 5: AGENTIC CORE (Update)
**Current State:** The circular animation for the Compliance Agent (ReAct loop) is broken and clipping outside its container card.
**The Fix:** Repair the CSS animation.
* Ensure the SVG `<svg>` tag has a strict `viewBox` (e.g., `0 0 100 100`) and the container `div` has `overflow: hidden` or appropriate padding.
* If using `offset-path` or a rotating `transform` for the circular dashed line, constrain the radius so it remains perfectly centered inside the "Compliance Agent" card without overflowing into the margins.