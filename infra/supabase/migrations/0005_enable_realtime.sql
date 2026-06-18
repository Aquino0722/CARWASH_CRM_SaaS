-- 0005_enable_realtime.sql
-- Enable Supabase Realtime for operational tables (idempotent)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'app'
      AND tablename = 'bays'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app.bays;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'app'
      AND tablename = 'work_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app.work_items;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'app'
      AND tablename = 'service_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app.service_orders;
  END IF;
END $$;