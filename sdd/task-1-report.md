# Fix 1

Command: `node apps/mobile/tests/skb-blocks.js`

Result: PASS — all 7 assertions passed, including the new byDiscipline emphasis muscle-key validation test.

Commit: 822325b (fix(engine): validate byDiscipline emphasis muscle keys)

Changes: Added muscle-key iteration in byDiscipline loop (packages/engine/src/lib/sportKnowledge/blocks.js line 33); added test case asserting invalid muscle keys are rejected (apps/mobile/tests/skb-blocks.js line 15). No concerns.
