export default {
  async scheduled(event, env, ctx) {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay(); // Sunday = 0

    // Always send HOURLY
    const responses = [{ frequency: "HOURLY" }];

    // Send DAILY at 00:00 UTC
    if (hour === 0) responses.push({ frequency: "DAILY" });

    // Send WEEKLY on Sunday at 00:00 UTC
    if (hour === 0 && day === 0) responses.push({ frequency: "WEEKLY" });

    for (const r of responses) {
      const res = await fetch("https://geteventpilot.com/api/webhooks/cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(r),
      });
      console.log(
        `Sent ${r.frequency} request. Response status: ${res.status}`
      );
    }
  },
};
