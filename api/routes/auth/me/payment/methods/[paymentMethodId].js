import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";

// DELETE /api/auth/me/payment/methods/:paymentMethodId
export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    return res.status(400).json({ message: "User-level billing disabled" });
  },
];
