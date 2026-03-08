import { z } from "zod";
import { zerialize } from "zodex";

const stripeConfigSchema = z.object({
  stripe: z.object({
    publishableKey: z.string().min(1),
  }),
});

export const get = (_req, res) => {
  const publishableKey =
    process.env.STRIPE_PK || process.env.VITE_STRIPE_PK || null;

  if (!publishableKey || !publishableKey.startsWith("pk_")) {
    console.error(
      "Stripe publishable key missing or invalid. Expected a pk_ value."
    );
    return res.status(500).json({ message: "Stripe is not configured" });
  }

  return res.json({
    stripe: {
      publishableKey,
    },
  });
};

export const query = [(_req, res) => res.json(zerialize(stripeConfigSchema))];
