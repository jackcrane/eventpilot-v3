export default {
  async scheduled(event, env, ctx) {
    const now = new Date();
    const minute = now.getUTCMinutes();
    const hour = now.getUTCHours();
    const day = now.getUTCDay(); // Sunday = 0

    const responses = [];

    // Always send MINUTELY
    responses.push({ frequency: "MINUTELY", minute });

    // Send HOURLY at the top of each hour
    if (minute === 0) responses.push({ frequency: "HOURLY", hour });

    // Send DAILY at 00:00 UTC
    if (minute === 0 && hour === 0) responses.push({ frequency: "DAILY" });

    // Send WEEKLY on Sunday at 00:00 UTC
    if (minute === 0 && hour === 0 && day === 0)
      responses.push({ frequency: "WEEKLY" });

    for (const r of responses) {
      const res = await fetch("https://geteventpilot.com/api/webhooks/cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(r),
      });
      console.log(
        `Sent ${
          r.frequency
        } request at ${now.toISOString()}. Response status: ${res.status}`
      );
    }
  },
};
