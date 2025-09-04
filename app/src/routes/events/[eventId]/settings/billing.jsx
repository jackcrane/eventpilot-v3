import React, { useMemo, useState } from "react";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import {
  Typography,
  Button,
  Badge,
  Util,
  Card,
  Table,
  Input,
} from "tabler-react-2";
import SetupForm from "../../../../../components/stripe/Stripe";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useStripeSetupIntent } from "../../../../../hooks/useStripeSetupIntent";
import { useEventBilling } from "../../../../../hooks/useEventBilling";
import { Row } from "../../../../../util/Flex";
import { useParams } from "react-router-dom";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK);

export const EventSettingsBillingPage = () => {
  const { eventId } = useParams();
  const {
    intent,
    customer_session,
    loading: siLoading,
    refetch: refetchSI,
  } = useStripeSetupIntent();
  const {
    billing,
    paymentMethods,
    defaultPaymentMethodId,
    invoices,
    billingEmail,
    goodPaymentStanding,
    loading,
    setDefaultPaymentMethod,
    removePaymentMethod,
    updateBillingEmail,
    refetch,
  } = useEventBilling({ eventId });

  const [emailDraft, setEmailDraft] = useState(billingEmail || "");

  const stripeOptions = useMemo(() => {
    if (!intent?.client_secret || !customer_session?.client_secret) return null;
    return {
      clientSecret: intent.client_secret,
      customerSessionClientSecret: customer_session.client_secret,
    };
  }, [intent?.client_secret, customer_session?.client_secret]);

  return (
    <EventPage
      title="Settings · Billing"
      description="Manage your payment methods and view invoice history."
    >
      <div className="d-flex align-items-center gap-2">
        <Typography.H5 className="mb-0 text-secondary">PAYMENTS</Typography.H5>
        <Badge soft color={goodPaymentStanding ? "success" : "danger"}>
          {goodPaymentStanding ? "In good standing" : "Action required"}
        </Badge>
      </div>
      <Typography.H1>Billing</Typography.H1>
      <Typography.Text>
        Your payment info is handled by Stripe and never stored on EventPilot's
        servers. Manage saved cards below and review your past invoices.
      </Typography.Text>
      <Util.Hr />

      <div className="row">
        <div className="col-md-6">
          <Card title="Payment Methods">
            {loading ? (
              <Typography.Text>Loading…</Typography.Text>
            ) : paymentMethods.length === 0 ? (
              <Typography.Text>No saved payment methods yet.</Typography.Text>
            ) : (
              <div className="table-responsive">
                <Table
                  columns={[
                    {
                      label: "Card",
                      accessor: "brand",
                      render: (_v, r) => (
                        <Row gap={1}>
                          <span>
                            {(r.brand || "").toUpperCase()} •••• {r.last4}
                          </span>
                          {r.isDefault && (
                            <Badge soft color="primary">
                              Default
                            </Badge>
                          )}
                        </Row>
                      ),
                    },
                    {
                      label: "Expires",
                      accessor: "expMonth",
                      render: (_v, r) => (
                        <span>
                          {String(r.expMonth || "").padStart(2, "0")}/
                          {r.expYear}
                        </span>
                      ),
                    },
                    {
                      label: "Actions",
                      accessor: "id",
                      render: (_v, r) => (
                        <Row gap={1} justify="flex-end">
                          {!r.isDefault && (
                            <Button
                              size="sm"
                              soft
                              color="primary"
                              onClick={() => setDefaultPaymentMethod(r.id)}
                            >
                              Make default
                            </Button>
                          )}
                          <Button
                            size="sm"
                            soft
                            color="danger"
                            disabled={r.isDefault}
                            onClick={() => removePaymentMethod(r.id)}
                          >
                            Remove
                          </Button>
                        </Row>
                      ),
                    },
                  ]}
                  data={paymentMethods}
                />
              </div>
            )}

            <Util.Hr />

            {stripeOptions ? (
              <Elements stripe={stripePromise} options={stripeOptions}>
                <Typography.H3>Add a new payment method</Typography.H3>
                <SetupForm
                  buttonText="Save Payment Method"
                  onSuccess={async () => {
                    await refetch();
                    await refetchSI();
                  }}
                />
              </Elements>
            ) : siLoading ? (
              <Typography.Text>Loading Stripe…</Typography.Text>
            ) : null}
          </Card>
        </div>

        <div className="col-md-6">
          <Card title="Billing Email">
            <Typography.Text>
              Invoices and payment receipts are sent to this email.
            </Typography.Text>
            <div className="d-flex gap-2 mt-2">
              <Input
                style={{ maxWidth: 360 }}
                value={emailDraft}
                onInput={(v) => setEmailDraft(v)}
                placeholder="billing@example.com"
                className="mb-0"
              />
              <Button onClick={() => updateBillingEmail(emailDraft)}>
                Save
              </Button>
            </div>
          </Card>

          <div className="mt-3" />

          <Card title="Invoice History">
            {loading ? (
              <Typography.Text>Loading…</Typography.Text>
            ) : invoices.length === 0 ? (
              <Typography.Text>No invoices yet.</Typography.Text>
            ) : (
              <div className="table-responsive">
                <Table
                  columns={[
                    {
                      label: "Date",
                      accessor: "created",
                      render: (v) => new Date(v * 1000).toLocaleDateString(),
                    },
                    {
                      label: "Status",
                      accessor: "status",
                      render: (v) => (
                        <Badge
                          soft
                          color={
                            v === "paid"
                              ? "success"
                              : v === "open"
                              ? "warning"
                              : "default"
                          }
                        >
                          {v}
                        </Badge>
                      ),
                    },
                    {
                      label: "Amount",
                      accessor: "amountPaid",
                      render: (_v, r) => (
                        <span>
                          {(
                            Math.max(
                              r.amountPaid || r.amountDue || 0,
                              r.amountDue || 0
                            ) / 100
                          ).toLocaleString(undefined, {
                            style: "currency",
                            currency: (r.currency || "usd").toUpperCase(),
                          })}
                        </span>
                      ),
                    },
                    {
                      label: "Links",
                      accessor: "id",
                      render: (_v, r) => (
                        <Row gap={1} justify="flex-end">
                          {r.hostedInvoiceUrl && (
                            <a
                              href={r.hostedInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Invoice
                            </a>
                          )}
                          {r.invoicePdf && (
                            <a
                              href={r.invoicePdf}
                              target="_blank"
                              rel="noreferrer"
                            >
                              PDF
                            </a>
                          )}
                          {r.receiptUrl && (
                            <a
                              href={r.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Receipt
                            </a>
                          )}
                        </Row>
                      ),
                    },
                  ]}
                  data={invoices}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </EventPage>
  );
};
