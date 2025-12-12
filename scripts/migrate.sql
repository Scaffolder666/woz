-- Add new columns to messages table for multiple choice support

ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN metadata TEXT;
