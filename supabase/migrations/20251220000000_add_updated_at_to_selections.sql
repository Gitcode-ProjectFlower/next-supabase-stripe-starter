-- Add updated_at column to selections table
ALTER TABLE selections
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create function to auto-update updated_at on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at when row is updated
DROP TRIGGER IF EXISTS update_selections_updated_at ON selections;
CREATE TRIGGER update_selections_updated_at
BEFORE UPDATE ON selections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Set updated_at to created_at for existing rows (so they have a value)
UPDATE selections
SET updated_at = created_at
WHERE updated_at IS NULL;

