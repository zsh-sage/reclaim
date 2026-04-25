# SYSTEM PROMPT: RECLAIM DECK OVERHAUL (SLIDE 4)

You are an expert frontend engineer. I need a complete rebuild of Slide 4 (System Architecture) using advanced CSS Grid/Flexbox and inline SVGs. 

**Goal:** Show a comprehensive, two-phase system architecture. It must look like a high-tech data flow diagram.

## STRUCTURE: TWO HORIZONTAL PHASES
Divide the slide vertically into two distinct lanes or rows.

### Phase 1 (Top Row): Policy Initialization
* **Visual Flow:** HR (SVG Icon) → Upload Policy (SVG Doc) → AI Extraction Engine (Pulsing SVG Node) → Policy Database (SVG Cylinder) → HR Review & Activate (Checkmark).
* **Styling:** Use a subtle `--s` (secondary) color theme for this top row to show it is the foundational setup. Connect the steps with a dashed SVG line.

### Phase 2 (Bottom Row): Core Claim Execution
This is the main event. It requires a 4-step horizontal flow. Steps 2, 3, and 4 must be "Expanded Nodes" (larger cards that detail the micro-steps inside them). Connect all main nodes with a thick, glowing `--p` (primary) line.

* **Node 1: Input**
  * Employee (SVG) → Upload Document (SVG).
* **Node 2: OCR Processing (Expanded Card)**
  * *Inside the card:* List the micro-flow visually. 
  * "Extract Data from Receipt" → "User Side-by-Side Verification" → "Send to Agent".
* **Node 3: Compliance Agent (Expanded Card)**
  * *Inside the card:* List the micro-flow visually. 
  * "Receive RAW JSON" → "Compare with Policy DB (draw a faint line connecting this back to the Phase 1 DB)" → "Call External Tools" → "Produce Result".
* **Node 4: Final Verdict (Expanded Card)**
  * *Inside the card:* List the outputs visually.
  * "HR Summary Dashboard" + "Policy Flags & Audit Logs" + "AI Result Status (Approve/Partial/Reject)".

**Animation Directives:**
Use CSS keyframes to animate a small glowing dot traveling along the connecting lines from Node 1 → Node 2 → Node 3 → Node 4. Apply a staggered fade-in (`animation-delay`) so Phase 1 appears first, followed by Phase 2.