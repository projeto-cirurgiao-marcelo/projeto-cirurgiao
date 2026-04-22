-- Add generationCount field to video_summaries table
ALTER TABLE "video_summaries" 
ADD COLUMN "generationCount" INTEGER NOT NULL DEFAULT 1;

-- Update existing records to have generationCount = version
UPDATE "video_summaries" 
SET "generationCount" = "version";