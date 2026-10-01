-- Knowledge Snake - Initial Database Schema
-- Migration: 20240101000000_initial_schema
-- Description: Initial database schema for Knowledge Snake educational game

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Table: teachers
-- Stores teacher accounts (will integrate with Supabase Auth later)
-- ============================================================================
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    email TEXT UNIQUE, -- For future Supabase Auth integration
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for teacher lookups
CREATE INDEX idx_teachers_email ON teachers(email);

-- ============================================================================
-- Table: games
-- Stores game sessions created by teachers
-- ============================================================================
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    pin CHAR(6) NOT NULL,
    name TEXT NOT NULL DEFAULT 'Knowledge Snake Game',
    status TEXT NOT NULL DEFAULT 'lobby'
        CHECK (status IN ('lobby', 'question', 'rolling', 'moving', 'finished', 'cancelled')),
    total_rounds SMALLINT NOT NULL DEFAULT 10
        CHECK (total_rounds BETWEEN 1 AND 20),
    current_round SMALLINT NOT NULL DEFAULT 0
        CHECK (current_round >= 0),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on pin for active games (not finished/cancelled)
-- This allows PIN reuse after a game finishes
CREATE UNIQUE INDEX idx_games_pin_active 
    ON games(pin) 
    WHERE status NOT IN ('finished', 'cancelled');

-- Index for teacher's games
CREATE INDEX idx_games_teacher_id ON games(teacher_id);

-- Index for game status queries
CREATE INDEX idx_games_status ON games(status);

-- Index for pin lookups
CREATE INDEX idx_games_pin ON games(pin);

-- ============================================================================
-- Table: game_players
-- Stores players participating in a game
-- ============================================================================
CREATE TABLE game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL, -- Client-generated, for session tracking
    nickname TEXT NOT NULL,
    avatar_id TEXT NOT NULL,
    position SMALLINT NOT NULL DEFAULT 1
        CHECK (position BETWEEN 1 AND 100),
    score INTEGER NOT NULL DEFAULT 1
        CHECK (score >= 0),
    finish_order SMALLINT, -- NULL if not finished, 1/2/3... for finish order
    finish_bonus SMALLINT NOT NULL DEFAULT 0
        CHECK (finish_bonus BETWEEN 0 AND 3),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- Index for game's players
CREATE INDEX idx_game_players_game_id ON game_players(game_id);

-- Index for player lookups within a game
CREATE INDEX idx_game_players_game_id_player_id ON game_players(game_id, player_id);

-- Index for leaderboard queries
CREATE INDEX idx_game_players_score ON game_players(game_id, score DESC);

-- ============================================================================
-- Table: questions
-- Stores teacher-created questions
-- ============================================================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    choice_a TEXT NOT NULL,
    choice_b TEXT NOT NULL,
    choice_c TEXT NOT NULL,
    choice_d TEXT NOT NULL,
    correct_answer SMALLINT NOT NULL
        CHECK (correct_answer BETWEEN 0 AND 3), -- 0=A, 1=B, 2=C, 3=D
    explanation TEXT,
    category TEXT,
    difficulty TEXT
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for teacher's questions
CREATE INDEX idx_questions_teacher_id ON questions(teacher_id);

-- Index for category/difficulty filtering
CREATE INDEX idx_questions_category_difficulty ON questions(category, difficulty);

-- ============================================================================
-- Table: game_questions
-- Links questions to games in specific order
-- ============================================================================
CREATE TABLE game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    question_order SMALLINT NOT NULL
        CHECK (question_order > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: each question can only appear once per game at a specific order
CREATE UNIQUE INDEX idx_game_questions_unique 
    ON game_questions(game_id, question_order);

-- Index for game's questions in order
CREATE INDEX idx_game_questions_game_id ON game_questions(game_id, question_order);

-- Index for question's games
CREATE INDEX idx_game_questions_question_id ON game_questions(question_id);

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_teachers_updated_at
    BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE teachers IS 'Teacher accounts for Knowledge Snake game';
COMMENT ON TABLE games IS 'Game sessions created by teachers';
COMMENT ON TABLE game_players IS 'Players participating in a game session';
COMMENT ON TABLE questions IS 'Teacher-created questions for the game';
COMMENT ON TABLE game_questions IS 'Links questions to games in specific order';

COMMENT ON COLUMN games.pin IS '6-character alphanumeric game PIN (unique for active games)';
COMMENT ON COLUMN games.status IS 'Current game phase: lobby, question, rolling, moving, finished, cancelled';
COMMENT ON COLUMN games.current_round IS 'Current round number (0 = not started)';
COMMENT ON COLUMN game_players.player_id IS 'Client-generated UUID for session tracking';
COMMENT ON COLUMN game_players.finish_order IS 'Finish order (1,2,3...) for bonus points; NULL if not finished';
COMMENT ON COLUMN game_players.finish_bonus IS 'Bonus points for finish order: 1st=3, 2nd=2, 3rd=1';
COMMENT ON COLUMN questions.correct_answer IS '0=A, 1=B, 2=C, 3=D';
COMMENT ON COLUMN game_questions.question_order IS 'Order of question in the game (1,2,3...)';