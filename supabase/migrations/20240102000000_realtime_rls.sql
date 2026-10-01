-- Knowledge Snake - Phase 3.3: Supabase Realtime + RLS
-- Migration: 20240102000000_realtime_rls
-- Description: Enable Supabase Realtime for game tables and add basic RLS policies

-- ============================================================================
-- PART 1: ENABLE SUPABASE REALTIME FOR GAME TABLES
-- ============================================================================
-- Per Supabase documentation, Realtime is enabled via publication.
-- We add the game tables to the supabase_realtime publication.

-- Enable Realtime for games table (game state, status, round, etc.)
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Enable Realtime for game_players table (player positions, scores, join/leave)
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- Enable Realtime for game_questions table (question order, current question)
ALTER PUBLICATION supabase_realtime ADD TABLE game_questions;

-- NOTE: We do NOT add 'questions' or 'teachers' to Realtime.
-- - questions table contains correct_answer - must never be exposed to students
-- - teachers table contains teacher account info

-- ============================================================================
-- PART 2: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- ============================================================================
-- RLS: games table
-- ============================================================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Teacher can SELECT their own games
CREATE POLICY games_teacher_select ON games
    FOR SELECT
    USING (teacher_id = auth.uid());

-- Teacher can INSERT their own games
CREATE POLICY games_teacher_insert ON games
    FOR INSERT
    WITH CHECK (teacher_id = auth.uid());

-- Teacher can UPDATE their own games (status, current_round, etc.)
CREATE POLICY games_teacher_update ON games
    FOR UPDATE
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- TODO: Student access to games
-- Students currently don't have Supabase Auth.
-- Game access is via Game PIN (public but not via RLS).
-- Server-authoritative game logic will handle student access via Game PIN.
-- For now, no student RLS policy on games.
-- 
-- FUTURE (Phase 3.4+): 
-- CREATE POLICY games_student_select ON games
--     FOR SELECT
--     USING (
--         -- Students access via Game PIN validated by server
--         -- This will require server-authoritative validation
--         EXISTS (
--             SELECT 1 FROM game_players 
--             WHERE game_players.game_id = games.id 
--             AND game_players.player_id = <client_player_id>
--         )
--     );

-- ============================================================================
-- RLS: game_players table
-- ============================================================================
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Teacher can SELECT players in their games
CREATE POLICY game_players_teacher_select ON game_players
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_players.game_id 
            AND games.teacher_id = auth.uid()
        )
    );

-- Teacher can INSERT players into their games (manual add)
CREATE POLICY game_players_teacher_insert ON game_players
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_players.game_id 
            AND games.teacher_id = auth.uid()
        )
    );

-- Teacher can UPDATE players in their games
CREATE POLICY game_players_teacher_update ON game_players
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_players.game_id 
            AND games.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_players.game_id 
            AND games.teacher_id = auth.uid()
        )
    );

-- TODO: Student access to game_players
-- Students don't have Auth yet. They access via Game PIN + player_id (client-generated).
-- Server-authoritative game logic validates player via Game PIN + player_id.
-- 
-- FUTURE (Phase 3.4+):
-- CREATE POLICY game_players_student_select ON game_players
--     FOR SELECT
--     USING (
--         -- Student can see players in their game
--         EXISTS (
--             SELECT 1 FROM games 
--             WHERE games.id = game_players.game_id 
--             AND games.pin = <game_pin_from_client>
--         )
--     );
-- 
-- CREATE POLICY game_players_student_insert ON game_players
--     FOR INSERT
--     WITH CHECK (
--         -- Student joins game via PIN
--         EXISTS (
--             SELECT 1 FROM games 
--             WHERE games.id = game_players.game_id 
--             AND games.pin = <game_pin_from_client>
--             AND games.status = 'lobby'
--         )
--     );

-- ============================================================================
-- RLS: game_questions table
-- ============================================================================
ALTER TABLE game_questions ENABLE ROW LEVEL SECURITY;

-- Teacher can SELECT game_questions for their games
CREATE POLICY game_questions_teacher_select ON game_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_questions.game_id 
            AND games.teacher_id = auth.uid()
        )
    );

-- Teacher can INSERT questions into their games
CREATE POLICY game_questions_teacher_insert ON game_questions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_questions.game_id 
            AND games.teacher_id = auth.uid()
        )
    );

-- Teacher can DELETE game_questions from their games
CREATE POLICY game_questions_teacher_delete ON game_questions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_questions.game_id 
            AND games.teacher_id = auth.uid()
        )
    );

-- TODO: Student access to game_questions
-- Students need to fetch questions for the current round.
-- However, questions table contains correct_answer which MUST NOT be exposed.
-- 
-- SECURITY: Students should NEVER query the questions table directly.
-- Instead, they query game_questions (which links to questions) 
-- but the correct_answer must be filtered out.
-- 
-- FUTURE (Phase 3.4+):
-- The server-authoritative game logic will:
-- 1. Fetch question from questions table (server-side, has correct_answer)
-- 2. Strip correct_answer, send PublicQuestion to client via Realtime
-- 2. Client receives question via game_questions Realtime event
-- 
-- For now, NO student RLS policy on game_questions.
-- Server will handle question delivery.

-- ============================================================================
-- RLS: questions table (CRITICAL: correct_answer must NEVER be exposed)
-- ============================================================================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Teacher can SELECT their own questions (including correct_answer)
CREATE POLICY questions_teacher_select ON questions
    FOR SELECT
    USING (teacher_id = auth.uid());

-- Teacher can INSERT their own questions
CREATE POLICY questions_teacher_insert ON questions
    FOR INSERT
    WITH CHECK (teacher_id = auth.uid());

-- Teacher can UPDATE their own questions
CREATE POLICY questions_teacher_update ON questions
    FOR UPDATE
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- Teacher can DELETE their own questions
CREATE POLICY questions_teacher_delete ON questions
    FOR DELETE
    USING (teacher_id = auth.uid());

-- NO student RLS policy on questions table.
-- Students MUST NEVER access questions table directly.
-- Server-authoritative game logic fetches question, strips correct_answer,
-- and delivers PublicQuestion to students via Realtime.

-- ============================================================================
-- RLS: teachers table
-- ============================================================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Teacher can SELECT their own profile
CREATE POLICY teachers_self_select ON teachers
    FOR SELECT
    USING (id = auth.uid());

-- Teacher can UPDATE their own profile
CREATE POLICY teachers_self_update ON teachers
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Teacher can INSERT their own profile (signup)
CREATE POLICY teachers_self_insert ON teachers
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- PART 3: SECURITY NOTES & FUTURE TODO
-- ============================================================================

/*
SECURITY ARCHITECTURE FOR STUDENT ACCESS (Phase 3.4+):

The current RLS setup only covers Teacher access (via Supabase Auth).
Students do NOT have Supabase Auth accounts in Phase 3.3.

STUDENT ACCESS MODEL (Phase 3.4+):
---------------------------------
1. Students join via Game PIN + client-generated player_id
2. Server-authoritative game logic validates:
   - Game PIN exists and game is in 'lobby' status
   - Player session exists or can be created
3. Server issues a short-lived JWT or session token for Realtime
4. Student connects to Realtime channels:
   - game:{pin}:state (game status, round, question, etc.)
   - game:{pin}:events (dice rolls, movements, etc.)
5. Server-authoritative game logic emits events to these channels
   - Never sends correct_answer
   - Only sends PublicQuestion (question + choices, no answer)

REALTIME CHANNELS (Phase 3.4+):
--------------------------------
- game:{pin}:state  -> games, game_players, game_questions (filtered)
- game:{pin}:events -> dice rolls, movements, answer results, phase changes

REALTIME FILTERS (Phase 3.4+):
-------------------------------
Use Supabase Realtime filters to limit what students receive:
- game:{pin}:state: filter by game_id = <game_id_from_pin>
- game:{pin}:events: filter by game_id = <game_id_from_pin>
- Students should NOT receive:
  - questions.correct_answer
  - teachers table
  - other games' data

IMPLEMENTATION NOTE:
The ProductionTransport (Phase 3.4+) will:
1. Validate student via Game PIN + player_id on server
2. Issue short-lived JWT for Realtime access
3. Subscribe student to filtered Realtime channels
4. Handle all game logic server-side
6. Emit filtered events to Realtime channels
*/

-- ============================================================================
-- PART 4: REALTIME PUBLICATION VERIFICATION
-- ============================================================================
-- Verify the publication has the correct tables
-- Run this query in Supabase SQL Editor to verify:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Should show: games, game_players, game_questions
-- Should NOT show: questions, teachers