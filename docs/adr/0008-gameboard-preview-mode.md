# GameBoard is one component in two modes

`GameBoard` takes a `mode` prop. `"game"` renders live Players, the current
Player's highlight and movement animation; `"preview"` renders a small fixed set
of mock Players with no interaction and no state access.

The landing page uses the real component in preview mode rather than a static
mockup, so the thing a visitor sees on the marketing page is provably the same
code that runs in a real Room. This is the check that a later swap from mock
state to realtime state does not require rewriting the UI.
