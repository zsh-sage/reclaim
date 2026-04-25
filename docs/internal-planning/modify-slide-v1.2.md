# SYSTEM PROMPT: RECLAIM DECK OVERHAUL (SLIDE 8 - FRAUD TRAP)

You are an expert frontend engineer. I need a complete redesign of Slide 8 (Fraud Trap Mechanics). The previous version was too large and the animations were poorly constrained. 

**STRICT LAYOUT CONSTRAINTS:**
* Use a 2-column grid (`display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;`).
* Wrap the entire grid in a container with a strict `max-width: 1100px; margin: 0 auto;`.
* Both columns will be distinct, styled cards (`class="card"`) with padding and `overflow: hidden`.

## CARD 1: THE HUMAN OVERRIDE (Input Tampering)
**Goal:** Show what happens when an employee edits the AI-extracted OCR data.
* **Header:** "Human Override Detection" (with an SVG Lock icon).
* **Visual Animation (Top half of card):**
  1. Draw a clean, minimal SVG representing a form input field. 
  2. Inside the input, the text initially reads "RM 20.00" (color: `--ok`).
  3. Animate a cursor SVG moving to the input. The text rapidly backspaces and changes to "RM 200.00".
  4. The moment it hits "200", the input border violently flashes `--err` (red).
* **Data Flow Visualization (Bottom half of card):**
  1. An SVG arrow points down to a simulated HR alert badge: "⚠️ Delta Detected: +900%".
  2. Below that, a progress bar representing "AI Flag Confidence" rapidly shoots from 10% to 99%, turning bright red.

## CARD 2: DIGITAL FORGERY (Visual Tampering)
**Goal:** Show the system catching manipulated receipt images.
* **Header:** "Image Integrity Analysis" (with an SVG Eye/Scanner icon).
* **Visual Animation (Top half of card):**
  1. Draw an SVG receipt. On the receipt, there is a line item: "RM 1000" (make the text large).
  2. Animate an SVG "scanning box" (a dashed square) sweeping horizontally across the receipt. 
  3. When the scanner hits the "1" in "1000", it stops. 
  4. The "1" pulses, and a visual "glitch" or pixelated bounding box appears around it.
* **Data Flow Visualization (Bottom half of card):**
  1. An SVG arrow points down to a console-style text block.
  2. Use a typewriter CSS animation to spit out: `> analyzing_pixels...` followed by `> ERROR: Artifact mismatch at coordinate X,Y. Possible photoshop overlay.` (Make the error text `--err` red).
  3. A final stamp SVG slams down: "REJECTED".