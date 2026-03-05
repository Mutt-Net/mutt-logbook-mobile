# PROMPT_build.md

Building mode instructions for Stratum.

---

## Mode: BUILDING

Your goal is to implement tasks from `IMPLEMENTATION_PLAN.md` one at a time, with full backpressure (tests, build, lint).

---

## Instructions

### Phase 0: Orientation

**0a.** Study `PROJECT_SPEC.md` to understand audience, JTBD, and constraints.

**0b.** Study `specs/*` with parallel subagents to learn requirements for the task you're addressing.

**0c.** Study `IMPLEMENTATION_PLAN.md` to understand the plan and pick the most important incomplete task.

**0d.** Study `src/lib/*` with parallel subagents to understand available shared utilities.

**0e.** Study relevant `src/*` files to understand current implementation state.

---

### Phase 1: Task Selection

**Choose the most important incomplete task** from `IMPLEMENTATION_PLAN.md`.

Consider:
- Dependencies (unblock other tasks)
- Foundation work (infrastructure, utilities)
- High-value features
- Risk mitigation

---

### Phase 2: Implementation

**Before coding:**
- Search existing code to confirm the functionality doesn't already exist
- Review `src/lib/` for utilities you can reuse
- Understand the acceptance criteria from specs

**While coding:**
- Follow existing code patterns
- Prefer `src/lib/` for shared utilities
- Make minimal changes necessary
- Write tests as part of implementation

**Required tests:**
- Implement tests specified in the task definition
- Tests verify outcomes from acceptance criteria
- Both conventional tests (behavior, correctness) and judgment tests (if applicable)

---

### Phase 3: Backpressure

**Before considering the task complete:**

1. **Build passes** - Run build command from `AGENTS.md`
2. **Tests pass** - Run test command from `AGENTS.md`
3. **Lint passes** - Run lint command from `AGENTS.md` (if applicable)
4. **All required tests exist and pass** - No cheating with skipped tests

If anything fails, fix it before proceeding.

---

### Phase 4: Completion

**Update `IMPLEMENTATION_PLAN.md`:**
- Mark task as complete: `- [x] Task name`
- Add completion date
- Note any discoveries, issues, or follow-ups

**Update `AGENTS.md` if:**
- You learned an operational lesson
- A command or convention changed
- Future agents need to know something

**Commit your changes:**
- One logical commit per task
- Clear commit message
- Include all related changes (code, tests, plan update)

---

## Guardrails

**999.** Required tests derived from acceptance criteria must exist and pass before committing. Tests are part of implementation scope, not optional.

**998.** Search before creating - confirm functionality doesn't exist before implementing.

**997.** Prefer `src/lib/` - Use shared utilities, don't duplicate.

**996.** Minimal changes - Change only what's necessary for the task.

**995.** Fresh context - Don't assume prior knowledge; read files each iteration.

---

## Important Principles

**One task per loop** - Complete one thing well, then exit.

**Backpressure is critical** - Tests and builds force self-correction.

**Context efficiency** - Stay in the smart zone (40-60% context utilization).

**Let Stratum Stratum** - You decide implementation approach; specs define outcomes.

**Plan is disposable** - If the plan is wrong, note it and continue; it can be regenerated.

---

## Ultimate Goal

Implement one task from `IMPLEMENTATION_PLAN.md` completely:
- Code written and tested
- All backpressure passes
- Plan updated
- Changes committed
- Ready for next fresh iteration
