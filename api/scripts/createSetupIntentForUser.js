import { prisma } from "#prisma";
import { stripe } from "#stripe";

const userId = "cma1hb8770009o2hlecr3fqdo";

const user = await prisma.user.findUnique({
  where: {
    id: userId,
  },
});

if (!user) {
  console.log("User not found");
  process.exit(1);
}

const setup_intent = await stripe.setupIntents.create({
  customer: user.stripe_customerId,
  automatic_payment_methods: {
    enabled: true,
  },
});

await prisma.logs.create({
  data: {
    type: "STRIPE_SETUP_INTENT_CREATED",
    userId,
    ip: "::1",
    data: setup_intent,
  },
});

console.log(setup_intent);
