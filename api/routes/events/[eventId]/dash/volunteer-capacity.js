import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { reportApiError } from "#util/reportApiError.js";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
      // Resolve instances for previous comparison
      const currentInstance = await prisma.eventInstance.findUnique({
        where: { id: instanceId, eventId },
      });

      // Jobs: limited = capacity > 0
      const jobs = await prisma.job.findMany({
        where: { eventId, instanceId, deleted: false },
        select: { id: true, capacity: true },
      });

      const limitedJobs = jobs.filter((j) => (j.capacity ?? 0) > 0);
      const jobsUnlimitedCount = jobs.length - limitedJobs.length;

      // Shift signups per job
      const jobSignupRows = await prisma.$queryRaw`
        SELECT s."jobId" as jobId, COUNT(vss.*)::int as count
        FROM "Shift" s
        LEFT JOIN "FormResponseShift" vss ON vss."shiftId" = s."id"
        WHERE s."eventId" = ${eventId}
          AND s."instanceId" = ${instanceId}
          AND s."deleted" = false
        GROUP BY s."jobId"
      `;
      const jobSignupMap = new Map(
        jobSignupRows.map((r) => [r.jobid || r.jobId, Number(r.count)])
      );

      const jobsTotalCapacity = limitedJobs.reduce(
        (sum, j) => sum + (j.capacity || 0),
        0
      );
      const jobsFilled = limitedJobs.reduce((sum, j) => {
        const signups = Number(jobSignupMap.get(j.id) || 0);
        const filled = Math.min(signups, j.capacity || 0);
        return sum + filled;
      }, 0);
      const jobsPercent =
        jobsTotalCapacity > 0 ? (jobsFilled / jobsTotalCapacity) * 100 : null;

      // Shifts: limited = capacity > 0, open + active
      const shifts = await prisma.shift.findMany({
        where: {
          eventId,
          instanceId,
          deleted: false,
          open: true,
          active: true,
        },
        select: {
          id: true,
          capacity: true,
          job: { select: { capacity: true } },
        },
      });
      const limitedShifts = shifts
        .map((s) => ({
          id: s.id,
          effectiveCapacity: s.capacity ?? s.job?.capacity ?? 0,
        }))
        .filter((s) => (s.effectiveCapacity ?? 0) > 0);
      const shiftsUnlimitedCount = shifts.length - limitedShifts.length;

      // Signup counts per limited shift
      let shiftFilled = 0;
      let shiftCapacity = 0;
      if (limitedShifts.length > 0) {
        const ids = limitedShifts.map((s) => s.id);
        const chunks = [];
        // chunk ids to avoid parameter limits
        for (let i = 0; i < ids.length; i += 1000)
          chunks.push(ids.slice(i, i + 1000));
        let signupMap = new Map();
        for (const chunk of chunks) {
          // eslint-disable-next-line no-await-in-loop
          const rows = await prisma.$queryRaw`
            SELECT "shiftId", COUNT(*)::int AS count
            FROM "FormResponseShift"
            WHERE "shiftId" IN (${prisma.join(chunk)})
            GROUP BY "shiftId"
          `;
          for (const r of rows) {
            signupMap.set(r.shiftid || r.shiftId, Number(r.count));
          }
        }
        for (const s of limitedShifts) {
          shiftCapacity += s.effectiveCapacity || 0;
          const c = Number(signupMap.get(s.id) || 0);
          shiftFilled += Math.min(c, s.effectiveCapacity || 0);
        }
      }
      const shiftsPercent =
        shiftCapacity > 0 ? (shiftFilled / shiftCapacity) * 100 : null;

      const hasExcluded = jobsUnlimitedCount > 0 || shiftsUnlimitedCount > 0;
      const allUnlimited = jobsTotalCapacity + shiftCapacity === 0;
      let note = null;
      if (allUnlimited) note = "All jobs and shifts have unlimited capacity";
      else if (hasExcluded)
        note = "Some jobs or shifts are excluded due to unlimited capacity";

      // Previous-instance comparison (as-of matched relative day from start)
      let previous = null;
      if (currentInstance) {
        const previousInstance = await prisma.eventInstance.findFirst({
          where: {
            eventId,
            deleted: false,
            startTime: { lt: currentInstance.startTime },
          },
          orderBy: { startTime: "desc" },
        });

        if (previousInstance) {
          const prevEnd = previousInstance.endTime ?? null;
          // Previous jobs
          const prevJobs = await prisma.job.findMany({
            where: { eventId, instanceId: previousInstance.id, deleted: false },
            select: { id: true, capacity: true },
          });
          const prevLimitedJobs = prevJobs.filter((j) => (j.capacity ?? 0) > 0);
          const prevJobsUnlimited = prevJobs.length - prevLimitedJobs.length;

          const prevJobSignupRows = await prisma.$queryRaw`
            WITH params AS (
              SELECT
                date_trunc('day', timezone('America/Chicago', now())) AS today_ct,
                date_trunc('day', timezone('America/Chicago', ${currentInstance.startTime})) AS cur_start_ct,
                date_trunc('day', timezone('America/Chicago', ${previousInstance.startTime})) AS prev_start_ct,
                date_trunc('day', timezone('America/Chicago', ${prevEnd})) AS prev_end_ct
            ), cutoff AS (
              SELECT
                CASE
                  WHEN prev_end_ct IS NULL THEN prev_start_ct + (today_ct - cur_start_ct)
                  ELSE LEAST(prev_start_ct + (today_ct - cur_start_ct), prev_end_ct)
                END AS prev_cutoff
              FROM params
            )
            SELECT s."jobId" as jobId, COUNT(vss.*)::int as count
            FROM "Shift" s
            LEFT JOIN "FormResponseShift" vss ON vss."shiftId" = s."id"
            WHERE s."eventId" = ${eventId}
              AND s."instanceId" = ${previousInstance.id}
              AND s."deleted" = false
              AND (
                vss."createdAt" IS NULL OR
                date_trunc('day', timezone('America/Chicago', vss."createdAt")) <= (SELECT prev_cutoff FROM cutoff)
              )
            GROUP BY s."jobId"
          `;
          const prevJobSignupMap = new Map(
            prevJobSignupRows.map((r) => [r.jobid || r.jobId, Number(r.count)])
          );
          const prevJobsTotalCapacity = prevLimitedJobs.reduce(
            (sum, j) => sum + (j.capacity || 0),
            0
          );
          const prevJobsFilled = prevLimitedJobs.reduce((sum, j) => {
            const signups = Number(prevJobSignupMap.get(j.id) || 0);
            return sum + Math.min(signups, j.capacity || 0);
          }, 0);
          const prevJobsPercent =
            prevJobsTotalCapacity > 0
              ? (prevJobsFilled / prevJobsTotalCapacity) * 100
              : null;

          // Previous shifts (limited, open+active)
          const prevShiftsRaw = await prisma.shift.findMany({
            where: {
              eventId,
              instanceId: previousInstance.id,
              deleted: false,
              open: true,
              active: true,
            },
            select: {
              id: true,
              capacity: true,
              job: { select: { capacity: true } },
            },
          });
          const prevLimitedShifts = prevShiftsRaw
            .map((s) => ({
              id: s.id,
              effectiveCapacity: s.capacity ?? s.job?.capacity ?? 0,
            }))
            .filter((s) => (s.effectiveCapacity ?? 0) > 0);
          const prevUnlimitedShifts =
            prevShiftsRaw.length - prevLimitedShifts.length;

          let prevShiftFilled = 0;
          let prevShiftCapacity = 0;
          if (prevLimitedShifts.length > 0) {
            const ids = prevLimitedShifts.map((s) => s.id);
            const chunks = [];
            for (let i = 0; i < ids.length; i += 1000)
              chunks.push(ids.slice(i, i + 1000));
            let signupMap = new Map();
            for (const chunk of chunks) {
              // eslint-disable-next-line no-await-in-loop
              const rows = await prisma.$queryRaw`
                WITH params AS (
                  SELECT
                    date_trunc('day', timezone('America/Chicago', now())) AS today_ct,
                    date_trunc('day', timezone('America/Chicago', ${currentInstance.startTime})) AS cur_start_ct,
                    date_trunc('day', timezone('America/Chicago', ${previousInstance.startTime})) AS prev_start_ct,
                    date_trunc('day', timezone('America/Chicago', ${prevEnd})) AS prev_end_ct
                ), cutoff AS (
                  SELECT
                    CASE
                      WHEN prev_end_ct IS NULL THEN prev_start_ct + (today_ct - cur_start_ct)
                      ELSE LEAST(prev_start_ct + (today_ct - cur_start_ct), prev_end_ct)
                    END AS prev_cutoff
                  FROM params
                )
                SELECT "shiftId", COUNT(*)::int AS count
                FROM "FormResponseShift"
                WHERE "shiftId" IN (${prisma.join(chunk)})
                  AND date_trunc('day', timezone('America/Chicago', "createdAt")) <= (SELECT prev_cutoff FROM cutoff)
                GROUP BY "shiftId"
              `;
              for (const r of rows)
                signupMap.set(r.shiftid || r.shiftId, Number(r.count));
            }
            for (const s of prevLimitedShifts) {
              prevShiftCapacity += s.effectiveCapacity || 0;
              const c = Number(signupMap.get(s.id) || 0);
              prevShiftFilled += Math.min(c, s.effectiveCapacity || 0);
            }
          }
          const prevShiftsPercent =
            prevShiftCapacity > 0
              ? (prevShiftFilled / prevShiftCapacity) * 100
              : null;

          previous = {
            jobs: {
              limitedCount: prevLimitedJobs.length,
              total: prevJobsTotalCapacity,
              filled: prevJobsFilled,
              percent: prevJobsPercent,
              unlimitedExcluded: prevJobsUnlimited,
            },
            shifts: {
              limitedCount: prevLimitedShifts.length,
              total: prevShiftCapacity,
              filled: prevShiftFilled,
              percent: prevShiftsPercent,
              unlimitedExcluded: prevUnlimitedShifts,
            },
          };
        }
      }

      res.json({
        jobs: {
          limitedCount: limitedJobs.length,
          total: jobsTotalCapacity,
          filled: jobsFilled,
          percent: jobsPercent,
          unlimitedExcluded: jobsUnlimitedCount,
        },
        shifts: {
          limitedCount: limitedShifts.length,
          total: shiftCapacity,
          filled: shiftFilled,
          percent: shiftsPercent,
          unlimitedExcluded: shiftsUnlimitedCount,
        },
        note,
        previous,
      });
    } catch (error) {
      console.error(
        "Error in GET /events/:eventId/dash/volunteer-capacity:",
        error
      );
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
