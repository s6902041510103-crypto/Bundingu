# Round-based movement: every correct Player moves, fastest first

A Round is simultaneous: all Players see the same Question and Answer at the same
time, and every Player who answered correctly gets a Turn. Turns are handed out in
order of answer speed, and the Host paces them one at a time from a visible
Movement Queue.

The alternative — one fixed Turn order for the whole class — was rejected because
it makes the Question feel like a formality for everyone except the current
Player. The cost of this model is that a Room of 40 correct answers produces 40
Turns, which is why the Host gets explicit pacing controls (call next, skip) and
the game also ends on a fixed Round count rather than on someone reaching Finish.
