# Special squares are real but disabled by default

Squares 25 (BONUS), 50 (GIFT) and 75 (BOOST) carry real effects:
- BONUS: the Player rolls again immediately after their Turn ends.
- GIFT: the Player advances three Squares after their Turn ends.
- BOOST: the Player's next Turn is granted without answering the Question.

The effects are encoded in `lib/game-data.ts` and the reducer knows how to apply them,
but the `enabled` flag on each Special Square defaults to `false`. This keeps the
Phase 1 scope clean while proving that the game engine can handle board effects
without any UI rewrite. In Phase 2 the Host will be able to toggle them per game.