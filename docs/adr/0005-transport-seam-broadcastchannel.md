# Transport seam: BroadcastChannel now, realtime channel later

Every state change in the client store goes through one `GameStateTransport`
interface. In Phase 1 the implementation is `BroadcastChannelTransport`, which
mirrors each new `GameState` to every other tab on the same origin, so opening
`/game/board` in one tab and `/game/question` in another shows genuinely
synchronised play on a single machine.

The alternative — no cross-tab sync, each tab an independent mock — was rejected
because the product's core promise is that every player sees the same Board, and
without sync there is nothing to demonstrate. `localStorage` events were the
other candidate and are worse: they only fire in *other* tabs, not the writer's
own, so the acting tab would disagree with everyone else.

This is a demo mechanism, not multiplayer. There is no server, no database and no
network. In Phase 2 `RealtimeTransport` implements the same interface and
subscribes to a realtime channel; no game component changes.
