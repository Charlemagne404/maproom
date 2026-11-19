# Riverways feedback signal audit

Date: 19 November 2026

## Question

How many of the bundled Riverways questions remain plausible after the current miss clues, and how does that change if distance rounding or direction detail is reduced?

This is a finite-data audit of clue signatures. It does not measure what a player notices, understands, remembers or chooses to guess.

## Method

`buildRiverQuestionPool` groups the 148 Natural Earth line features into 134 named questions. The difficulty pools contain 45 Easy questions (scale rank at most 2), 84 Medium questions (at most 3), and 134 Hard questions (at most 4). The calculated centre of every question falls inside a catalogued country in the bundled country geometry.

For each possible target and each distinct wrong river in its pool, I compared the displayed clue signature against every other still-eligible target. A signature includes the rounded great-circle distance from target line centre to guessed line centre and the direction. For the two-miss calculation, both miss signatures and the target-centre country are included, and both guesses are excluded from candidate targets. All possible target and wrong-guess combinations are enumerated; the combinations are weighted equally, not by likely human guesses.

The current setting rounds distance to the nearest 50 km, uses eight compass directions, and omits direction when centres are less than 25 km apart. Sensitivity settings use nearest 100, 250 or 500 km and either eight compass directions or four cardinal sectors. The same under-25 km direction rule is retained. Distance and direction come from the same centre and great-circle helpers used by Riverways; a check against the production helper matched all 17,956 centre pairs, including same-river pairs.

## Current setting

“Unique” is the share of enumerated cases in which the visible clue signature leaves exactly one candidate target, including the actual target. Candidate count summaries are across all possible target/wrong-guess cases.

| Pool | Questions | After first miss: unique | Mean candidates | P90 candidates | After second miss and country: unique | Mean candidates | P90 candidates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy | 45 | 83.2% | 1.23 | 2 | 94.3% | 1.08 | 1 |
| Medium | 84 | 82.1% | 1.22 | 2 | 96.8% | 1.04 | 1 |
| Hard | 134 | 77.5% | 1.28 | 2 | 96.9% | 1.04 | 1 |

## Hard-pool sensitivity

This compares the hardest pool because it has the largest candidate set. The four-way version uses cardinal sectors derived from the same bearing; it is not a relabeling of the eight-way directions.

| Distance rounding / directions | First-miss unique | First-miss P90 candidates | Two misses + country unique | Two misses + country P90 candidates |
| --- | ---: | ---: | ---: | ---: |
| 50 km / 8-way (current) | 77.5% | 2 | 96.9% | 1 |
| 50 km / 4-way | 72.4% | 2 | 96.9% | 1 |
| 100 km / 8-way | 62.6% | 3 | 93.7% | 1 |
| 100 km / 4-way | 55.5% | 3 | 93.6% | 1 |
| 250 km / 8-way | 37.6% | 4 | 83.7% | 2 |
| 250 km / 4-way | 29.4% | 5 | 83.0% | 2 |
| 500 km / 8-way | 20.8% | 6 | 70.6% | 2 |
| 500 km / 4-way | 14.2% | 7 | 69.0% | 3 |

## Decision and limits

The current clue is highly discriminating over this finite question bank: most first-miss cases have one matching target signature, and the added country clue makes the two-miss signatures unique in roughly 94–97% of cases. Coarser alternatives preserve more ambiguity, especially after the first miss. That does not show which precision feels fair or enjoyable. A player's prior knowledge and choice of wrong river can make the practical signal much stronger or weaker than these exhaustive averages.

No clue precision or game rule changed from this audit. The next evidence should come from moderated first-read and replay sessions. Recruit 6–8 casual players for short Free Play rounds in more than one difficulty pool. Before explaining the wording, ask what “centre” distance and direction mean; after each miss, ask what the player would try next and why. Record whether they interpret the measure as line-centre distance rather than nearest-course distance, which clue they use, guesses and completion, perceived fairness, and any point where they feel the target has become obvious. Treat this as a qualitative pilot, not a population estimate. If the current setting often makes the target obvious after one miss or is misunderstood, compare 50 km against a coarser setting in a counterbalanced follow-up.

This audit does not test centre-point geographic accuracy, names or aliases, clue accessibility, player preference, completion rate, competitive balance, or real-world river navigation. The source lines are generalized Natural Earth features, and their calculated centres are compact clue points rather than hydrographic network measurements.
