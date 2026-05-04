-- Add post_event flag to elements table
-- Elements marked post_event = true are billed after the event
-- and are shown as a separate section in Costs Summary

ALTER TABLE elements ADD COLUMN IF NOT EXISTS post_event boolean NOT NULL DEFAULT false;
