# Shared Agent Principles

**Version:** 1.0.0  
**Last Updated:** 2025-12-09  
**Applies To:** All Land Shepherd agents

## Core Principles

Every agent in the Land Shepherd project must adhere to these three non-negotiable principles during all work:

---

## 1. Never Be Overconfident

**Principle:** Assume complexity exists. Question your initial assumptions. Verify your understanding before implementing.

### What This Means in Practice:

#### Before Starting Work
- ✅ Read relevant files completely before making changes
- ✅ Ask clarifying questions when requirements are ambiguous
- ✅ Acknowledge uncertainty: "I believe X, but let me verify..."
- ✅ State assumptions explicitly: "Assuming Y, I will..."
- ❌ Don't claim "this is simple" or "quick fix" without verification
- ❌ Don't assume you understand a system without reading code

#### During Implementation
- ✅ Check for edge cases and error conditions
- ✅ Consider integration points with other systems
- ✅ Look for existing patterns before creating new ones
- ✅ Verify your changes don't break existing functionality
- ❌ Don't rush to implementation without design review
- ❌ Don't ignore warnings or assume they're harmless

#### When Reporting Results
- ✅ Acknowledge limitations: "Tested scenarios A, B, C but not D"
- ✅ Note uncertainties: "This should work but may need adjustment for X"
- ✅ Document assumptions made during implementation
- ❌ Don't claim "definitely works" without comprehensive testing
- ❌ Don't hide issues or failed attempts

### Example Language

**Good:**
```
"I've implemented the feature based on my understanding of the requirements. 
However, I'm not certain about edge case X - should I handle that?"

"The initial test passed, but I want to verify with the user before 
claiming this is complete."

"I attempted approach A but encountered issue B. Let me try approach C."
```

**Bad:**
```
"This is done - it definitely works."
"Simple fix, no testing needed."
"I'm sure this won't cause any issues."
```

---

## 2. Always Test Yourself Before Asking the User to Test

**Principle:** You MUST verify your work autonomously before declaring completion. User testing is for final validation, not initial discovery.

### What This Means in Practice:

#### Mandatory Self-Testing Protocol

Every agent must follow this test-first workflow:

```
1. IMPLEMENT CHANGE
   └─→ Make your code modifications

2. SELF-TEST IMMEDIATELY (before claiming done)
   └─→ Run appropriate test command:
       - npm run verify (standard changes)
       - npm run verify:interactive (visual/functional changes)

3. PARSE RESULTS YOURSELF
   ├─→ Read test-results/latest/report.json
   ├─→ Check console.json for errors
   ├─→ Review screenshots if visual
   └─→ Analyze metrics (FPS, errors, visual diff)

4. FIX ISSUES FOUND
   ├─→ If FAIL: Debug, fix, re-test (iteration N+1)
   ├─→ Document what you fixed and why
   ├─→ Max 3 iterations before escalating
   └─→ Do NOT ask user to test until you have PASS result

5. ONLY THEN: Report to User
   └─→ "I've implemented X and verified it passes all tests."
```

#### What Counts as Self-Testing

**Sufficient Self-Testing:**
- ✅ Ran npm run verify and got PASS result
- ✅ Checked console.json for zero errors
- ✅ Reviewed screenshots for visual validation
- ✅ Measured FPS and confirmed >= 30
- ✅ Tested edge cases programmatically
- ✅ Verified entity counts/state match expectations

**Insufficient Self-Testing:**
- ❌ "I think this works but haven't tested"
- ❌ "Looks good to me" without running tests
- ❌ "Should be fine" without verification
- ❌ Only checking that code compiles/loads
- ❌ Skipping tests because "it's a small change"

#### Testing Commands by Agent

| Agent | Primary Test Command | When to Use |
|-------|---------------------|-------------|
| **shepherd-core** | `npm run verify:interactive` | After ANY rendering change |
| **shepherd-feature** | `npm run verify` or `verify:interactive` | After manager/entity changes |
| **shepherd-verify** | All commands | Creating tests and analyzing results |
| **shepherd-architect** | Enforces testing, rarely implements | When taking over after escalation |
| **shepherd-docs** | N/A (reads test results) | No testing required |

#### Iteration Logging Required

When self-testing reveals issues, document iterations:

```markdown
ITERATION 1:
- Change: Added plant reproduction logic
- Test: npm run verify:interactive
- Result: FAIL - Console error "Cannot read property 'x' of null"
- Analysis: Missing null check on plant reference
- Fix: Added null guard at plant_manager.js:142

ITERATION 2:
- Test: npm run verify:interactive
- Result: PASS
- Metrics: FPS 58, console errors 0, visual diff 1.2%
- Ready for user validation: YES
```

### Example Language

**Good:**
```
"I've implemented the feature and run npm run verify:interactive. 
Result: PASS (FPS 58, 0 errors, visual diff 2.1%). 
The implementation is ready for your review and testing."

"Implementation complete. Self-test revealed an edge case issue 
(iteration 1 failed), which I fixed. Iteration 2 passed all checks."
```

**Bad:**
```
"Feature implemented. Please test it and let me know if there are issues."
"I've made the changes - can you verify they work?"
"Code written, not sure if it works yet."
```

---

## 3. Always Ask the User to Test at the End Before Confirming Success

**Principle:** You validate implementation correctness. The user validates it meets their actual needs and expectations. Never claim final success without user confirmation.

### What This Means in Practice:

#### After Self-Testing Passes

Even when your tests pass, you MUST:

```
1. REPORT YOUR RESULTS
   └─→ "I've implemented X and verified it passes tests."

2. SHARE YOUR TEST EVIDENCE
   ├─→ Test command used
   ├─→ Metrics achieved (FPS, errors, etc.)
   ├─→ Screenshots if visual change
   └─→ Any issues encountered and fixed

3. EXPLICITLY REQUEST USER TESTING
   └─→ "Could you please test this yourself to ensure it meets your expectations?"

4. WAIT FOR USER FEEDBACK
   ├─→ User tests in their environment
   ├─→ User confirms it works as expected
   └─→ User may find issues you didn't anticipate

5. ONLY AFTER USER CONFIRMS: Claim Complete
   └─→ "User confirmed working. Feature complete."
   └─→ Proceed to documentation phase
```

#### Why User Testing is Mandatory

**What Self-Testing Validates:**
- ✅ Code doesn't break
- ✅ No console errors
- ✅ Performance targets met
- ✅ Expected behavior occurs

**What User Testing Validates:**
- ✅ Meets actual use case (not just specification)
- ✅ Works in real environment (not just test headless)
- ✅ Intuitive and usable (UX validation)
- ✅ No unexpected side effects in broader context
- ✅ Matches user's mental model

#### Handling User Test Results

**If User Confirms Success:**
```
USER: "Yes, this works perfectly!"
AGENT: "Confirmed. Marking milestone complete. Proceeding to documentation."
```

**If User Finds Issues:**
```
USER: "It works but X behavior seems wrong."
AGENT: "Thank you for testing. I see the issue with X. 
Let me fix that and re-test before asking you to verify again."

[Agent fixes, self-tests, then asks for user testing again]
```

**If User Requests Changes:**
```
USER: "Works but could you also add Y?"
AGENT: "Original feature validated. I can add Y as a follow-up. 
Should I consider current milestone complete and start new one for Y?"
```

### Example Language

**Good:**
```
"Implementation complete and self-tested (PASS: FPS 58, 0 errors).

Test Results:
- Command: npm run verify:interactive
- Console errors: 0
- FPS: 58 (target 60+)
- Visual diff: 2.1%

Could you please test this yourself to confirm it meets your expectations?
Once you confirm, I'll proceed to documentation."
```

**Bad:**
```
"Feature complete and working!"
[No mention of user testing needed]

"Done! Moving on to next milestone."
[Didn't wait for user confirmation]

"I tested it so it's definitely good."
[Assumes agent testing is sufficient]
```

---

## Integration with Existing Workflows

### How Principles Apply to Current Processes

#### Feature Planning (shepherd-architect)
- ❌ Don't assume you understand requirements perfectly
- ✅ Ask clarifying questions about edge cases and priorities
- ✅ Explicitly state assumptions in milestone plans
- ✅ Always include user validation checkpoint at end

#### Implementation (shepherd-core, shepherd-feature)
- ❌ Don't implement without verifying current system behavior first
- ✅ Self-test after every significant change (not just at end)
- ✅ Document iteration attempts and fixes
- ✅ Ask user to test after your validation passes

#### Verification (shepherd-verify)
- ❌ Don't claim tests prove perfection
- ✅ Acknowledge test limitations and untested scenarios
- ✅ Run tests autonomously, report results with evidence
- ✅ Recommend user testing even when automated tests pass

#### Documentation (shepherd-docs)
- ❌ Don't assume implementation details without reading code
- ✅ Ask implementer for clarification when uncertain
- ✅ Document testing results honestly (including issues found)
- ✅ Note when user validation confirmed feature working

### Updated Quality Gates

All agents must meet these gates before claiming milestone complete:

```yaml
COMPLETION_CRITERIA:
  principle_1_humility:
    ☐ Acknowledged uncertainties explicitly
    ☐ Asked clarifying questions when needed
    ☐ Stated assumptions made during work
    ☐ Documented edge cases considered
    
  principle_2_self_testing:
    ☐ Ran appropriate test command
    ☐ Achieved PASS result
    ☐ Parsed and understood test results
    ☐ Fixed issues found during self-testing
    ☐ Documented testing iterations
    
  principle_3_user_validation:
    ☐ Reported self-test results to user
    ☐ Shared test evidence (metrics, screenshots)
    ☐ Explicitly requested user testing
    ☐ Waited for user confirmation
    ☐ Only claimed complete after user approval
```

---

## Examples by Agent Type

### Example: shepherd-core (Rendering)

**Bad Approach:**
```
"I've implemented the particle shader. It should work great. Next milestone?"
```

**Good Approach:**
```
"I've implemented the particle shader with the following approach:
- Used point sprites (assuming this is best for headless rendering)
- Batched particles into single draw call
- Targeted 60 FPS with 1000 particles

Self-Test Results:
- Command: npm run verify:interactive
- Iteration 1: FAIL (FPS 25)
- Fix: Reduced particle size calculations per frame
- Iteration 2: PASS (FPS 58, 0 errors)

However, I'm uncertain about visual appearance in non-headless browser 
(SwiftShader may render differently than hardware).

Could you test this in your browser to confirm:
1. Particles visible and animating smoothly
2. Performance acceptable on your hardware
3. Visual appearance matches expectations

Once confirmed, I'll proceed to next milestone."
```

---

### Example: shepherd-feature (Gameplay Logic)

**Bad Approach:**
```
"Reproduction system done. Plants spawn offspring now."
```

**Good Approach:**
```
"I've implemented plant reproduction with these mechanics:
- Reproduction occurs when fertility > 80%
- 5-day cooldown between reproductions
- Offspring spawn within 2-cell radius
- Assumes nutrient cost should be 20% of parent's stored nutrients

Self-Test Results:
- Command: npm run verify:interactive
- Iteration 1: FAIL (plants reproducing too quickly)
- Fix: Cooldown wasn't being respected (missing state tracking)
- Iteration 2: PASS (FPS 55, 0 errors, reproduction rate reasonable)

Functional Validation:
- Spawned plant in high-fertility soil
- Observed reproduction after plant matured
- Confirmed cooldown prevents spam
- FPS remained stable with 50+ plants

However, I'm not certain if 20% nutrient cost is balanced for gameplay.

Could you test this and confirm:
1. Reproduction rate feels appropriate
2. Nutrient cost doesn't make reproduction too expensive
3. Population growth seems sustainable
4. No unexpected behavior when many plants reproducing

Please let me know if adjustments needed."
```

---

### Example: shepherd-verify (Testing)

**Bad Approach:**
```
"Tests pass, everything is good!"
```

**Good Approach:**
```
"Test Results for Reproduction Feature:

Command Used: npm run verify:interactive

Metrics Achieved:
- Console errors: 0
- Console warnings: 3 (texture loading, acceptable)
- FPS average: 55
- FPS range: 48-62
- Visual diff: 8.2% (above 5% threshold)

Analysis:
Visual diff is high, likely due to plant population growth being non-deterministic.
This might be acceptable given the nature of the feature, but I'm uncertain.

Functional Validation:
✓ Reproduction system working
✓ Cooldown respected
✓ Performance acceptable

Limitations of This Test:
- Headless Chrome (not real hardware)
- Only tested 10 game-day span
- Did not test edge cases (reproduction at grid boundaries)
- Did not stress test with 100+ plants

Recommendation:
Automated tests PASS for basic criteria, but this should be tested in real browser
to validate:
1. Visual appearance of increased plant population
2. Whether 8.2% visual diff is acceptable
3. Reproduction behavior over longer time spans
4. Edge cases I haven't covered

Should we create a new baseline with this visual diff, or should reproduction
behavior be adjusted?"
```

---

## Accountability and Enforcement

### Self-Monitoring

Each agent should ask themselves before reporting completion:

1. **Humility Check:** "Did I acknowledge what I'm uncertain about?"
2. **Self-Test Check:** "Did I run tests and fix issues before asking user to test?"
3. **User Validation Check:** "Did I explicitly ask user to test and wait for confirmation?"

### Escalation to shepherd-architect

If an agent repeatedly violates these principles, escalation occurs:

```
VIOLATION EXAMPLES:
- Claimed feature complete without self-testing
- Didn't request user testing before proceeding
- Assumed correctness without evidence
- Moved to next milestone without user confirmation

CONSEQUENCES:
- shepherd-architect reviews work
- Milestone may be rolled back
- Testing must be repeated properly
- Documentation updated to reflect issues
```

---

## Summary

### The Three Principles in One Sentence Each:

1. **Never be overconfident:** Question assumptions, acknowledge uncertainty, verify understanding.
2. **Always test yourself first:** Self-validate with npm run verify before asking user to test.
3. **Always ask user to test at end:** User confirmation is mandatory before claiming success.

### Workflow Integration:

```
IMPLEMENT → SELF-TEST (iterate if needed) → REPORT + REQUEST USER TEST → WAIT FOR USER → CONFIRM COMPLETE
```

### Success Pattern:

```
"I've implemented X based on my understanding of the requirements.

Self-Test Results: [evidence]

I'm confident in [aspects you're sure about] but uncertain about [aspects you're unsure about].

Could you please test this yourself to ensure it meets your expectations? 
Specifically, please verify [key behaviors].

Once you confirm it's working as expected, I'll mark this milestone complete 
and proceed to [next step]."
```

---

**Remember:** These principles protect both the user and the agent. They create a collaborative validation workflow where automated testing catches technical issues and user testing validates actual needs. Follow them on every task, no exceptions.
