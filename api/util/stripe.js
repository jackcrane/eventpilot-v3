import Stripe from "stripe";

const createId = (prefix) =>
  `${prefix}_mock_${Math.random().toString(36).slice(2, 12)}`;

const createStripeMock = () => {
  const customers = new Map();
  const paymentMethods = new Map();
  const subscriptions = new Map();

  const api = {
    customers: {
      create: async (data = {}) => {
        const id = data.id || createId("cus");
        const record = {
          id,
          email: data.email || null,
          name: data.name || null,
          metadata: data.metadata || {},
          invoice_settings: {
            default_payment_method:
              data.invoice_settings?.default_payment_method || null,
          },
        };
        customers.set(id, record);
        return record;
      },
      retrieve: async (id) => {
        return (
          customers.get(id) || {
            id,
            metadata: {},
            invoice_settings: { default_payment_method: null },
          }
        );
      },
      update: async (id, data = {}) => {
        const current =
          customers.get(id) || {
            id,
            metadata: {},
            invoice_settings: { default_payment_method: null },
          };
        const next = {
          ...current,
          ...data,
          invoice_settings: {
            ...current.invoice_settings,
            ...(data.invoice_settings || {}),
          },
        };
        customers.set(id, next);
        return next;
      },
    },
    setupIntents: {
      create: async (data = {}) => ({
        id: createId("seti"),
        client_secret: createId("seti_secret"),
        status: data.status || "requires_confirmation",
        ...data,
      }),
    },
    customerSessions: {
      create: async () => ({
        id: createId("cs"),
        client_secret: createId("cs_secret"),
      }),
    },
    paymentMethods: {
      create: async (data = {}) => {
        const id = data.id || createId("pm");
        const pm = {
          id,
          type: data.type || "card",
          customer: data.customer || null,
          ...data,
        };
        paymentMethods.set(id, pm);
        return pm;
      },
      retrieve: async (id) => {
        return paymentMethods.get(id) || { id, customer: null };
      },
      attach: async (id, { customer }) => {
        const current = await api.paymentMethods.retrieve(id);
        const updated = { ...current, customer };
        paymentMethods.set(id, updated);
        const cust = customers.get(customer);
        if (cust) {
          customers.set(customer, {
            ...cust,
            invoice_settings: {
              ...(cust.invoice_settings || {}),
              default_payment_method:
                cust.invoice_settings?.default_payment_method || updated.id,
            },
          });
        }
        return updated;
      },
      list: async ({ customer } = {}) => ({
        data: Array.from(paymentMethods.values()).filter((pm) => {
          if (!customer) return true;
          return pm.customer === customer;
        }),
      }),
    },
    subscriptions: {
      create: async ({ customer, default_payment_method, ...rest } = {}) => {
        const id = createId("sub");
        const subscription = {
          id,
          status: "active",
          customer,
          default_payment_method: default_payment_method || null,
          ...rest,
        };
        subscriptions.set(id, subscription);
        if (customer && default_payment_method) {
          const cust = customers.get(customer);
          if (cust) {
            customers.set(customer, {
              ...cust,
              invoice_settings: {
                ...(cust.invoice_settings || {}),
                default_payment_method,
              },
            });
          }
        }
        return subscription;
      },
      cancel: async (id) => {
        const sub = subscriptions.get(id);
        subscriptions.delete(id);
        return {
          id,
          status: "canceled",
          ...sub,
        };
      },
    },
    invoices: {
      pay: async (id) => ({
        id: id || createId("in"),
        status: "paid",
      }),
    },
  };
  return api;
};

const shouldMock = process.env.STRIPE_MOCK === "true" || !process.env.STRIPE_SK;

export const stripe = shouldMock
  ? createStripeMock()
  : new Stripe(process.env.STRIPE_SK);

export const isStripeMock = shouldMock;

// Account-level standing: treat as "has at least one attached card" or a default PM
// This is used for onboarding nudges; event-level enforcement lives on Event.goodPaymentStanding
export const isCustomerInGoodStanding = async (customerId) => {
  if (!customerId) return false;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPm = customer?.invoice_settings?.default_payment_method;
    if (defaultPm) return true;
    if (!stripe.paymentMethods?.list) return Boolean(defaultPm);
    const pms = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1,
    });
    return (pms?.data?.length || 0) > 0;
  } catch (e) {
    if (shouldMock) return false;
    void e;
    return false;
  }
};
