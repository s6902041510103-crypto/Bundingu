# Overflow is a rendering concern, not a data concern

A Square holds every Player standing on it. When more than six Players share one
Square, the Board draws the first six tokens plus a `+N` badge; tapping the badge
lists the rest. Nobody is ever dropped from the Room to make the Board look tidy.

Dropping players from the view was rejected outright — it breaks the promise
that every player is on the Board and can see everyone else. The badge plus a
tappable list keeps the Board readable without lying about who is playing.
