# SYSTEM PROMPT: RECLAIM DECK REDESIGN

You are an expert frontend engineer and UI/UX designer. Your task is to refactor specific slides in a provided `slides.html` document. 

**STRICT DESIGN CONSTRAINTS:**
1. **Zero Emojis:** Strip out every single emoji (`🧑‍💼`, `📧`, `📂`, `📎`, `⚠`, etc.). Replace them entirely with inline, monoline SVGs. 
2. **Ruthless Text Reduction:** Cut paragraph lengths by 50%. The slides must be scannable in 3 seconds. Use keywords, stats, and visual hierarchy instead of prose.
3. **SVG Spot Animations:** Use CSS to animate SVG properties (`stroke-dasharray`, `transform`, `opacity`, `fill`) to represent data flow and state changes.
4. **Layout:** Shift vertical stack layouts into horizontal `flex-row` layouts where specified to maximize screen real estate.
5. **Color Palette:** Strictly adhere to the existing CSS variables (`--p`, `--err`, `--ok`, `--warn`, `--t`).

Below is the slide-by-slide execution plan. Generate the complete HTML and CSS for these updated sections.

---

## 1. SLIDE 2: THE PROBLEM (The Bottleneck)
**Goal:** Visually demonstrate 100% of claims hitting a manual HR wall.
* **Layout:** 2-column grid. Left side: Massive typography for stats. Right side: SVG Data Flow Visualization.
* **Left Content (Stats):**
  * `<h1 class="text-err">100%</h1>` (Subtext: Claims reviewed manually)
  * `<h1>5-10 Days</h1>` (Subtext: Turnaround time)
  * `<h1>0</h1>` (Subtext: Automated fraud signals)
* **Right Content (The Bottleneck Visualization):**
  * Create an SVG showing 5 horizontal lines (representing claims) moving from left to right.
  * Animate them merging into a single, narrow central node (representing the HR queue).
  * Use CSS `stroke` animation to show the lines turning from neutral white to `--err` (red) as they hit the bottleneck, piling up.

## 2. SLIDE 3: THE SOLUTION (Efficiency by Exception)
**Goal:** Show the three distinct routing buckets side-by-side.
* **Layout:** `display: flex; flex-direction: row; gap: 2rem;` (Three equal-width columns). Quote spans the bottom.
* **Column 1: Bucket A (Passed)**
  * **Visual:** An SVG document with an animated vertical scanning line passing over it. When the line hits the bottom, a heavy SVG checkmark scales in, and the document border pulses `--ok` (green).
  * **Text:** "AI verified. Zero violations. Fast-tracked."
* **Column 2: Bucket B (Requires Attention)**
  * **Visual:** Same scanning line, but it stops midway. The document border turns `--warn` (orange), and a specific path inside the SVG document pulses red to highlight an anomaly.
  * **Text:** "Policy breach flagged. HR provided with exact clause."
* **Column 3: The Fraud Trap**
  * **Visual:** SVG of a split screen (Receipt vs. Digital Form). A cursor SVG moves, a value changes, and an SVG padlock snaps shut instantly, pulsing `--t` (purple).
  * **Text:** "Immutable audit trail. Every edit logged and mathematically verified."
* **Bottom Quote:** Full width, subtle background gradient, italicized text: *"Efficiency by Exception. AI classifies every claim before HR opens a single case."*

## 3. SLIDE 4: SYSTEM ARCHITECTURE (Agentic Core)
**Goal:** Replace static boxes with an active, glowing data pipeline.
* **Layout:** Continuous horizontal SVG pipeline connecting three primary nodes.
* **The Nodes (SVG based):**
  1. OCR Processing (Sub-nodes pulsing for parallel execution)
  2. Compliance Agent (LangGraph ReAct loop animation)
  3. Final Verdict
* **The Animation:** * Create an SVG `<circle>` acting as a "data packet".
  * Animate this circle moving along an SVG `<path>` connecting the nodes using CSS `offset-path` or `transform: translate`. 
  * As the packet hits a node, the node scales up slightly (`scale(1.05)`) and pulses its respective brand color (`--s`, `--t`, `--p`).

## 4. SLIDE 8: FRAUD TRAP MECHANICS (The X-Ray)
**Goal:** Prove the system catches mathematical tampering.
* **Layout:** 2-column. Left: Tamper Visualization. Right: Live JSON output.
* **Left Content (Tamper Visual):**
  * Two SVG boxes side-by-side. Box 1: "Receipt: $85.00". Box 2: "User Input: $850.00".
  * Draw an SVG `<path>` connecting the two numbers. Animate an alert icon traveling along the path.
* **Right Content (Live JSON):**
  * Keep the `CHANGE_SUMMARY` code block, but apply a typewriter CSS animation so the JSON writes itself out dynamically when the slide becomes active.
  * Apply a hard highlight (background-color) to the specific line: `"delta_pct": 900` to immediately draw the eye to the fraud trigger.

  ## 5. SLIDE 5: AGENTIC CORE (Three Pipelines)
**Goal:** Replace the bulleted text lists with modular SVG "circuit diagrams" that show the data transformations.
* **Layout:** 3 columns (`display: flex; gap: 2rem`).
* **Column 1: Policy Agent**
  * **Visual:** An SVG showing a `[PDF Icon]` connected by a glowing line to a `[Gear/Process Icon]`, which connects to a `[Bracket/JSON Icon]`.
  * **Animation:** A small pulse of light travels along the connecting lines.
  * **Text:** Title: "Policy Agent". Subtext: "Unstructured PDF → Structured JSON". (Remove all other text).
* **Column 2: Document Agent**
  * **Visual:** A single `[Receipt Icon]` whose path splits into 4 parallel, horizontal glowing lines (representing the ThreadPoolExecutor). The lines hit 4 smaller nodes, then converge back into one output node.
  * **Animation:** The 4 parallel lines pulse with light simultaneously to emphasize parallel processing.
  * **Text:** Title: "Document Agent". Subtext: "Parallel OCR Processing". 
* **Column 3: Compliance Agent**
  * **Visual:** A circular SVG path with three nodes on it, representing the ReAct (Reason + Act) loop. An arrow points out of the loop to a final `[Shield/Check Icon]`.
  * **Animation:** A dashed stroke rotates continuously around the circular path.
  * **Text:** Title: "Compliance Agent". Subtext: "ReAct Evaluation Loop".

## 6. SLIDE 9: MVP SCOPE & ROADMAP
**Goal:** Replace the boring checklist and timeline with a "Launch Status" board and a dynamic data path.
* **Layout:** 2 columns. Left: Shipped MVP. Right: Roadmap.
* **Left Content (Shipped MVP):**
  * **Visual:** A 2x2 grid of minimalist "System Modules" (dark cards with subtle borders). 
  * **Module Design:** Inside each module, place a single relevant SVG icon, a 2-3 word title (e.g., "Parallel OCR", "Fraud Trap", "Policy Studio", "ReAct Engine"), and an aggressively glowing green status indicator (`<div class="pulsing-green-dot"></div> <span class="text-ok">LIVE</span>`).
  * **Text Reduction:** Strip out all the explanatory sentences. The glowing "LIVE" badges do the talking.
* **Right Content (Roadmap):**
  * **Visual:** Draw a curved, winding SVG `<path>` traveling from top to bottom. Place 3 unfilled nodes along this path.
  * **Animation:** Use a `--p` (primary color) dashed stroke with an infinite linear `stroke-dashoffset` animation to make the path look like data flowing into the future. 
  * **Text:** Next to the 3 nodes, place minimal text: "Auto-PDF Generation", "Async Job Queue", "Admin Portal". Remove all secondary explanations.