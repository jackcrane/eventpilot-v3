-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "participantStatsCalendarMetric" TEXT NOT NULL DEFAULT 'count',
ADD COLUMN     "participantStatsDisplayFormat" TEXT NOT NULL DEFAULT 'calendar',
ADD COLUMN     "participantStatsTimeframe" TEXT NOT NULL DEFAULT '6',
ADD COLUMN     "volunteerStatsCalendarMetric" TEXT NOT NULL DEFAULT 'count',
ADD COLUMN     "volunteerStatsDisplayFormat" TEXT NOT NULL DEFAULT 'calendar',
ADD COLUMN     "volunteerStatsTimeframe" TEXT NOT NULL DEFAULT '6';
