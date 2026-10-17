# Knowledge Snake

The vocabulary of an educational board game played live in a classroom. Players
join a room with a PIN, answer questions, and move an animal token around a
100-square board where snakes pull you down and ladders lift you up.

## The Room

**Room**:
The shared game session that every device in the class joins. A Room exists from
the moment a Host creates it until the game ends.
_Avoid_: Game, Session, Match, Lobby

**PIN**:
The six-digit code that identifies a Room and is all a Player needs to enter it.
_Avoid_: Room Code, Join Code, Password, Access Key

**Host**:
The Player who created the Room and is responsible for pacing the game — revealing
answers and calling each Player's turn.
_Avoid_: Teacher, Owner, Admin, Moderator (a Teacher may be the Host, but the
Host is a role inside the game, not a real-world job)

## The Player

**Player**:
A named seat inside a Room, represented on the board by an animal token.
_Avoid_: Student, Contestant, Competitor, User, Guest

**Nickname**:
The display name a Player chooses when joining. It is the only identity a Player
needs — there is no account.
_Avoid_: Username, Login, Real Name, Display Name

**Avatar**:
The animal token that represents a Player on the board and in every list. All
Avatars come from one single illustrated set.
_Avoid_: Icon, Image, Profile Picture, Character, Token (a Token is the physical
piece on the board; an Avatar is its identity)

## The Board

**Board**:
The 100-square track every Player travels. Everyone in the Room always sees the
same Board.
_Avoid_: Map, Grid, Level, Field, Arena

**Square**:
One of the 100 numbered positions on the Board. Squares are numbered 1 to 100 in
a boustrophedon path: row 1 runs left to right, row 2 runs right to left.
_Avoid_: Cell, Tile, Node, Step, Box, Position (a Square is a place; a Position is
where a Player currently stands)

**Snake**:
A link from a Square to a much lower Square. Landing on its head sends a Player
sliding down.
_Avoid_: Trap, Penalty, Hazard, Downlink

**Ladder**:
A link from a Square to a much higher Square. Landing on its foot lifts a Player.
_Avoid_: Boost, Bonus, Shortcut, Uplink, Spring

**Special Square**:
A Square that does something other than hold a number: Start, Finish, Star, Gift
or Boost. A Square can be a Special Square *and* the head of a Snake.
_Avoid_: Bonus Square, Power-up (a Special Square is a place on the Board, not a
thing a Player collects)

**Start**:
Square 1, where every Player begins.
_Avoid_: Origin, Beginning, Zero

**Finish**:
Square 100. A Player can only reach it by rolling exactly the right number.
_Avoid_: Goal, End, Win, Home, Checkpoint

## Playing a Round

**Question**:
One quiz item shown to every Player in the Room at the same time, with a countdown.
_Avoid_: Quiz, Prompt, Task, Problem (a Prompt is only the text of a Question)

**Answer**:
A Player's choice for a Question. A correct Answer earns a place in the Movement
Queue; a wrong Answer simply earns nothing.
_Avoid_: Reply, Selection, Option (an Option is a single choice *within* a Question)

**Option**:
One of the four choices attached to a Question.
_Avoid_: Choice, Answer (an Answer is what the Player picks, not what they pick from)

**Round**:
One Question plus everything that follows from it — answers, reveal, and every
Player's movement. The game is a fixed number of Rounds.
_Avoid_: Turn, Question, Level

**Roll**:
The act of shaking the die. Each Player takes at most one Roll per Round, and
only after answering correctly.
_Avoid_: Dice (the die is the object, the Roll is the act), Throw, Spin

**Turn**:
One Player's Roll and everything it causes on the Board.
_Avoid_: Step, Move, Round

**Roll Queue**:
The ordered list of Players who answered the current Question correctly and are
still waiting for their Turn. The order is fastest correct answer first.
_Avoid_: Movement Queue, Line, Order, Queue (Queue is generic; Roll Queue is
specific), Leaderboard

**Pacing Mode**:
How fast the Host works through the Roll Queue. Auto works the queue by itself;
Manual waits for the Host to call each Turn.
_Avoid_: Speed, Autoplay, Mode (Mode alone is ambiguous — every screen has modes)

## Scoring

**Score**:
A Player's points. A Score equals the Square the Player finished on, plus a
Finish Bonus for the first three Players to reach the Finish.
_Avoid_: Points, XP, Total (a Score is a single number with a defined formula)

**Finish Bonus**:
Extra points — 3, 2, 1 — awarded to the first, second and third Player to reach
the Finish.
_Avoid_: Winner Bonus, Prize, Podium Points

**Leaderboard**:
Every Player in the Room ranked by Score, always visible, never filtered.
_Avoid_: Ranking, Standings, High Scores (High Scores implies persistence across
games; a Leaderboard is scoped to one Room)
