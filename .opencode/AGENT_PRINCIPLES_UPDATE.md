# Agent Principles Update - December 9, 2025

## Summary

Updated the Land Shepherd agentic system to enforce three core principles across all agents, ensuring higher quality work, proper testing workflows, and collaborative user validation.

## Changes Made

### 1. Created Shared Principles Document

**File:** `.opencode/shared-principles.md` (NEW)

Comprehensive documentation of three mandatory principles:

1. **Never Be Overconfident**
   - Question assumptions and acknowledge uncertainties
   - Ask clarifying questions when requirements are ambiguous
   - Explicitly state what you're uncertain about

2. **Always Test Yourself Before Asking User to Test**
   - Run `npm run verify` or `npm run verify:interactive` before claiming completion
   - Parse results yourself, fix issues found, document iterations
   - Only report to user after self-testing passes

3. **Always Ask User to Test at End Before Confirming Success**
   - User validation mandatory even when automated tests pass
   - Explicitly request user testing with specific validation points
   - Wait for user confirmation before claiming milestone complete

**Workflow Pattern:** `IMPLEMENT → SELF-TEST → REPORT + REQUEST USER TEST → WAIT → CONFIRM`

### 2. Updated All Agent Definitions

Added "Shared Principles (MANDATORY)" section to each agent:

#### shepherd-architect.md
- Enforces principles on delegated agents
- Includes user validation checkpoints in all milestone plans
- Blocks progression if principles violated
- Location: Lines 162-210

#### shepherd-core.md
- Requires `npm run verify:interactive` after every rendering change
- Visual validation mandatory for all rendering work
- Must share screenshots and metrics before asking user to test
- Location: Lines 87-138

#### shepherd-feature.md
- Requires `npm run verify` after every feature implementation
- Functional testing workflow defined
- Gameplay balance validation needs user input
- Location: Lines 84-133

#### shepherd-verify.md
- Runs tests autonomously, provides analysis
- Acknowledges test limitations
- Recommends user testing even when automated tests pass
- Location: Lines 85-132

#### shepherd-docs.md
- Reviews code before documenting (doesn't just rely on descriptions)
- Requests user review of documentation clarity
- Validates configuration examples are correct
- Location: Lines 71-117

### 3. Updated Capabilities Matrix

**File:** `.opencode/capabilities.md`

- Added "Shared Principles (ALL AGENTS)" section at top (lines 7-28)
- Updated version to 1.1.0
- Provides quick reference to the three principles
- Links to full shared-principles.md document

### 4. Updated Root AGENTS.md

**File:** `AGENTS.md`

- Added "Shared Agent Principles (READ FIRST)" section at top
- Summarizes the three principles with workflow pattern
- Links to detailed shared-principles.md
- Emphasizes these principles apply to ALL agents

## Key Benefits

### Quality Improvement
- Agents acknowledge when they're uncertain
- Prevents overconfident claims without evidence
- Creates culture of questioning and verification

### Testing Discipline
- Self-testing mandatory before claiming completion
- Issues discovered and fixed during development, not after user reports
- Test-fix-test iterations documented for transparency

### User Collaboration
- User validation explicitly requested for every milestone
- Clear separation: agent validates technical correctness, user validates actual needs
- Wait-for-confirmation prevents premature progression

### Accountability
- Quality gates enforce principle adherence
- shepherd-architect blocks progression if principles violated
- Clear escalation path when agents skip required steps

## Integration with Existing Workflows

### Feature Implementation Workflow
```
Planning (architect) → Implementation (core/feature) → Verification (verify) → Documentation (docs)

AT EACH STEP:
1. Agent questions assumptions (Principle 1)
2. Agent self-tests implementation (Principle 2)
3. Agent requests user validation (Principle 3)
4. Wait for user confirmation before proceeding
```

### Milestone Progression
```
OLD: Agent claims "done" → User finds issues → Rework
NEW: Agent claims "self-tested" → Requests user test → User confirms → Proceed
```

### Quality Gates Enhanced
```yaml
CANNOT_PROCEED_WITHOUT:
  ☐ Acknowledged uncertainties explicitly
  ☐ Ran self-test and achieved PASS
  ☐ Reported self-test results with evidence
  ☐ Requested user validation
  ☐ Received user confirmation
```

## Example Interaction Patterns

### Before (Problematic)
```
AGENT: "Feature implemented. Proceeding to next milestone."
[User finds issues later]
```

### After (Correct)
```
AGENT: "Feature implemented. I'm implementing reproduction with 20% nutrient cost, 
but I'm uncertain if this is balanced.

Self-Test Results:
- npm run verify:interactive PASS
- FPS 55, 0 errors, 8.2% visual diff
- Iteration 1: FAIL (cooldown ignored)
- Iteration 2: PASS (fixed state tracking)

Please test to confirm:
1. Reproduction rate feels appropriate
2. Nutrient cost is balanced
3. No unexpected behavior

Once you confirm, I'll proceed to documentation."

USER: [Tests] "Works great! Proceed."

AGENT: "User confirmed. Marking milestone complete. Notifying shepherd-docs."
```

## File Structure

```
.opencode/
├── shared-principles.md          # NEW - Core principles document (detailed)
├── AGENT_PRINCIPLES_UPDATE.md   # NEW - This summary
├── capabilities.md              # UPDATED - Added principles section
├── agent/
│   ├── shepherd-architect.md    # UPDATED - Added principles section
│   ├── shepherd-core.md         # UPDATED - Added principles section
│   ├── shepherd-feature.md      # UPDATED - Added principles section
│   ├── shepherd-verify.md       # UPDATED - Added principles section
│   └── shepherd-docs.md         # UPDATED - Added principles section
└── [other files unchanged]

ROOT/
└── AGENTS.md                    # UPDATED - Added principles summary at top
```

## Validation

All agents now include:
- ✅ Reference to shared-principles.md at top of their definition
- ✅ Agent-specific interpretation of each principle
- ✅ Self-testing workflow appropriate to their role
- ✅ User validation requirements for their outputs
- ✅ Examples of good vs bad adherence

## Next Steps

These principles are now mandatory for all agent work. Agents will:
1. Read shared-principles.md at start of each task
2. Follow the three principles throughout implementation
3. Report completion only after self-testing and requesting user validation
4. Wait for user confirmation before claiming milestone complete

shepherd-architect will enforce these principles on all delegated agents and block progression if violated.

## References

- **Full Principles Documentation:** `.opencode/shared-principles.md`
- **Agent Capabilities Matrix:** `.opencode/capabilities.md`
- **Root Agent Guide:** `AGENTS.md`
- **Individual Agent Definitions:** `.opencode/agent/[agent-name].md`
- **OpenCode Documentation:** https://opencode.ai/docs/

---

**Implementation Date:** December 9, 2025  
**Implemented By:** shepherd-architect  
**Status:** Complete and Active
