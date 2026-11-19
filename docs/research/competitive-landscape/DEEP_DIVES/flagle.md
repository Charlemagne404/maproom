# Flagle

**Source:** [flagle.io](https://flagle.io/) · **Accessed:** 19 November 2026 · **Evidence:** one wrong guess; round not completed.

## Observed

The active flag appeared as a 3×3 tile reveal. One wrong Italy guess left five guesses and exposed additional flag information. The game also displayed distance, direction and a proximity-style percentage, following a guess-driven feedback loop. The bonus trivia was advertised but not completed in this session.

## Documented and interpreted

The official game description advertises six guesses, progressive flag revelation and a short trivia bonus. The underlying design principle is controlled information gain: the image becomes more recognizable after a miss, but the player still has a reason to commit another answer. Different flag layouts may reveal very different information per tile, so the reveal sequence needs content-aware fairness review.

Maproom Flag Study already has typed and choice formats plus an optional progressive-reveal setting. A useful follow-up is to evaluate reveal balance across a test set of flags; adopting a fixed tile order without analysis could make large single-color regions too easy or leave distinctive details hidden too long. The sampled wrong guess is not evidence about complete scoring or all reveal sequences.
