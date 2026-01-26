# Unified Workflow Steps

All modes share core steps with mode-specific variations.

## Step 0: Intent Detection & Setup

1. Parse input with `intent-detection.md` rules
2. Log detected mode: `✓ Step 0: Mode [X] - [reason]`
3. If mode=code: detect plan path, set active plan
4. Use TaskCreate to create workflow step tasks (with dependencies if complex)

**Output:** `✓ Step 0: Mode [interactive|auto|fast|parallel|no-test|code] - [detection reason]`

## Step 1: Research (skip if fast/code mode)

**Interactive/Auto:**
- Spawn multiple `researcher` agents in parallel
- Use `/scout:ext` or `scout` agent for codebase search
- Keep reports ≤150 lines

**Parallel:**
- Optional: max 2 researchers if complex

**Output:** `✓ Step 1: Research complete - [N] reports gathered`

### [Review Gate 1] Post-Research (skip if auto mode)
- Present research summary to user
- AskUserQuestion: "Proceed to planning?" / "Request more research" / "Abort"
- **Auto mode:** Skip this gate

## Step 2: Planning

**Interactive/Auto/No-test:**
- Use `planner` agent with research context
- Create `plan.md` + `phase-XX-*.md` files

**Fast:**
- Use `/plan:fast` with scout results only
- Minimal planning, focus on action

**Parallel:**
- Use `/plan:parallel` for dependency graph + file ownership matrix

**Code:**
- Skip - plan already exists
- Parse existing plan for phases

**Output:** `✓ Step 2: Plan created - [N] phases`

### [Review Gate 2] Post-Plan (skip if auto mode)
- Present plan overview with phases
- AskUserQuestion: "Approve plan and start implementation?" / "Request revisions" / "Abort"
- **Auto mode:** Skip this gate

## Step 3: Implementation

**All modes:**
- Execute phase tasks sequentially (Step 3.1, 3.2, etc.)
- Use `ui-ux-designer` for frontend
- Use `ai-multimodal` for image assets
- Run type checking after each file

**Parallel mode:**
- Launch multiple `fullstack-developer` agents
- Respect file ownership boundaries
- Wait for parallel group before next

**Output:** `✓ Step 3: Implemented [N] files - [X/Y] tasks complete`

### [Review Gate 3] Post-Implementation (skip if auto mode)
- Present implementation summary (files changed, key changes)
- AskUserQuestion: "Proceed to testing?" / "Request implementation changes" / "Abort"
- **Auto mode:** Skip this gate

## Step 4: Testing (skip if no-test mode)

**All modes (except no-test):**
- Write tests: happy path, edge cases, errors
- Use `tester` agent
- If failures: `debugger` → fix → repeat
- **Forbidden:** fake mocks, commented tests, changed assertions

**Output:** `✓ Step 4: Tests [X/X passed]`

### [Review Gate 4] Post-Testing (skip if auto mode)
- Present test results summary
- AskUserQuestion: "Proceed to code review?" / "Request test fixes" / "Abort"
- **Auto mode:** Skip this gate

## Step 5: Code Review

**Interactive/Parallel/Code/No-test:**
- Use `code-reviewer` agent
- Interactive cycle (max 3): see `review-cycle.md`
- Requires user approval

**Auto:**
- Auto-approve if score≥9.5 AND 0 critical
- Auto-fix critical (max 3 cycles)
- Escalate to user after 3 failed cycles

**Fast:**
- Simplified review, no fix loop
- User approves or aborts

**Output:** `✓ Step 5: Review [score]/10 - [Approved|Auto-approved]`

## Step 6: Finalize

**All modes:**
1. `project-manager` + `docs-manager` subagents in parallel
2. Onboarding check (API keys, env vars)
3. Auto-commit via `git-manager` subagent

**Auto mode:** Continue to next phase automatically
**Others:** Ask user before next phase

**Output:** `✓ Step 6: Finalized - Status updated - Committed`

## Mode-Specific Flow Summary

Legend: `[R]` = Review Gate (human approval required)

```
interactive: 0 → 1 → [R] → 2 → [R] → 3 → [R] → 4 → [R] → 5(user) → 6
auto:        0 → 1 → 2 → 3 → 4 → 5(auto) → 6 → next phase (NO stops)
fast:        0 → skip → 2(fast) → [R] → 3 → [R] → 4 → [R] → 5(simple) → 6
parallel:    0 → 1? → [R] → 2(parallel) → [R] → 3(multi-agent) → [R] → 4 → [R] → 5(user) → 6
no-test:     0 → 1 → [R] → 2 → [R] → 3 → [R] → skip → 5(user) → 6
code:        0 → skip → skip → 3 → [R] → 4 → [R] → 5(user) → 6
```

**Key difference:** `auto` mode is the ONLY mode that skips all review gates.

## Critical Rules

- Never skip steps without mode justification
- Use TaskUpdate to mark tasks complete immediately
- One task in_progress at a time (enforce via TaskList check)
- All step outputs follow format: `✓ Step [N]: [status] - [metrics]`
