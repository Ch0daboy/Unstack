/*
  # Create writing personas table

  1. New Tables
    - `writing_personas`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, not null)
      - `description` (text)
      - `author_name` (text)
      - `sample_text` (text)
      - `analysis_results` (jsonb)
      - `preferences` (jsonb)
      - `is_favorite` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `writing_personas` table
    - Add policies for users to manage their own personas

  3. Indexes
    - Add indexes for performance optimization

  4. Update books table
    - Add `writing_persona_id` column to books table
*/

-- Create writing_personas table
CREATE TABLE IF NOT EXISTS writing_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  author_name text DEFAULT '',
  sample_text text DEFAULT '',
  analysis_results jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE writing_personas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own personas"
  ON writing_personas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personas"
  ON writing_personas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas"
  ON writing_personas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas"
  ON writing_personas
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_writing_personas_user_id ON writing_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_personas_name ON writing_personas(user_id, name);
CREATE INDEX IF NOT EXISTS idx_writing_personas_favorite ON writing_personas(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_writing_personas_created_at ON writing_personas(user_id, created_at DESC);

-- Add writing_persona_id to books table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'writing_persona_id'
  ) THEN
    ALTER TABLE books ADD COLUMN writing_persona_id uuid REFERENCES writing_personas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for books persona relationship
CREATE INDEX IF NOT EXISTS idx_books_writing_persona_id ON books(writing_persona_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_writing_persona_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_writing_personas_updated_at ON writing_personas;
CREATE TRIGGER update_writing_personas_updated_at
  BEFORE UPDATE ON writing_personas
  FOR EACH ROW
  EXECUTE FUNCTION update_writing_persona_updated_at();
