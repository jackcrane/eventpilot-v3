import { prisma } from "#prisma";
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SK);

export const isCustomerInGoodStanding = async (customerId) => {
  // 1. Get customer with default payment method
  const user = await prisma.user.findFirst({
    where: {
      stripe_customerId: customerId,
    },
  });

  return !!user?.goodPaymentStanding;
};
