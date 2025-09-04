import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
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
      const jobSignupMap = new Map(jobSignupRows.map((r) => [r.jobid || r.jobId, Number(r.count)]));

      const jobsTotalCapacity = limitedJobs.reduce((sum, j) => sum + (j.capacity || 0), 0);
      const jobsFilled = limitedJobs.reduce((sum, j) => {
        const signups = Number(jobSignupMap.get(j.id) || 0);
        const filled = Math.min(signups, j.capacity || 0);
        return sum + filled;
      }, 0);
      const jobsPercent = jobsTotalCapacity > 0 ? (jobsFilled / jobsTotalCapacity) * 100 : null;

      // Shifts: limited = capacity > 0, open + active
      const shifts = await prisma.shift.findMany({
        where: {
          eventId,
          instanceId,
          deleted: false,
          open: true,
          active: true,
        },
        select: { id: true, capacity: true, job: { select: { capacity: true } } },
      });
      const limitedShifts = shifts
        .map((s) => ({ id: s.id, effectiveCapacity: (s.capacity ?? s.job?.capacity ?? 0) }))
        .filter((s) => (s.effectiveCapacity ?? 0) > 0);
      const shiftsUnlimitedCount = shifts.length - limitedShifts.length;

      // Signup counts per limited shift
      let shiftFilled = 0;
      let shiftCapacity = 0;
      if (limitedShifts.length > 0) {
        const ids = limitedShifts.map((s) => s.id);
        const chunks = [];
        // chunk ids to avoid parameter limits
        for (let i = 0; i < ids.length; i += 1000) chunks.push(ids.slice(i, i + 1000));
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
      const shiftsPercent = shiftCapacity > 0 ? (shiftFilled / shiftCapacity) * 100 : null;

      const hasExcluded = jobsUnlimitedCount > 0 || shiftsUnlimitedCount > 0;
      const allUnlimited = (jobsTotalCapacity + shiftCapacity) === 0;
      let note = null;
      if (allUnlimited) note = "All jobs and shifts have unlimited capacity";
      else if (hasExcluded) note = "Some jobs or shifts are excluded due to unlimited capacity";

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
      });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/volunteer-capacity:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
