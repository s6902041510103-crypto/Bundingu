# One GameShell component, two routes

`/game/board` and `/game/question` are two routes that render the same
`GameShell` with a different variant prop, reading from the same client store.
`variant="projector"` is the large Host view; `variant="player"` is the
student-facing view that still shows the Board but leads with the Question and
big answer Options.

They are separate routes rather than one responsive page because the two devices
have opposite priorities: the Host needs queue and pacing controls, the Player
needs reachable Options. A single breakpoint-driven page would have to hide one
audience's controls from the other.

Mock state is seeded deterministically and persisted to `sessionStorage`, so a
hard refresh does not reset a game in progress. In Phase 2 the store's dispatch
is replaced by a realtime channel without touching any component.
