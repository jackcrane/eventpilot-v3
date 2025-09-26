-- Add UNSUBSCRIBED to EmailStatus enum (idempotent for PG 12+)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EmailStatus'
      AND e.enumlabel = 'UNSUBSCRIBED'
  ) THEN
    ALTER TYPE "EmailStatus" ADD VALUE 'UNSUBSCRIBED';
  END IF;
END $$;