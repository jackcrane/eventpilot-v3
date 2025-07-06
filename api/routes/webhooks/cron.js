export const post = async (req, res) => {
  console.log("Received cron webhook");
  const { frequency } = req.body;
  console.log(`[WEBHOOK][CRON] Received ${frequency} webhook`);

  return res.status(200).json({ message: "Webhook received" });
};
