
ALTER TABLE public.attendance_entries
ADD COLUMN finalized_at timestamp with time zone DEFAULT NULL;
