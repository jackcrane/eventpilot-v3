import React, { useState } from "react";
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
import { StripeTrigger } from "../../../../../components/stripe/Stripe";
import { useEventBilling } from "../../../../../hooks/useEventBilling";
import { Row } from "../../../../../util/Flex";
import { useParams } from "react-router-dom";

export const EventSettingsBillingPage = () => {
  const { eventId } = useParams();
  const {
    billing,
    paymentMethods,
    defaultPaymentMethodId,
    invoices,
    upcomingInvoice,
    billingEmail,
    goodPaymentStanding,
    loading,
    setDefaultPaymentMethod,
    removePaymentMethod,
    updateBillingEmail,
    refetch,
  } = useEventBilling({ eventId });

  const [emailDraft, setEmailDraft] = useState(billingEmail || "");

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
            <Typography.H3>Add a new payment method</Typography.H3>
            <StripeTrigger
              eventId={eventId}
              onSuccess={async (setupIntent) => {
                const pmId =
                  setupIntent?.payment_method || setupIntent?.paymentMethod?.id;
                if (pmId) {
                  await setDefaultPaymentMethod(pmId);
                }
                await refetch();
              }}
            >
              Add Payment Method
            </StripeTrigger>
          </Card>
        </div>

        <div className="col-md-6">
          <Card title="Upcoming Invoice" className="mb-3">
            {loading ? (
              <Typography.Text>Loading…</Typography.Text>
            ) : upcomingInvoice ? (
              <div>
                <Typography.Text>
                  {upcomingInvoice.byPeriodEnd
                    ? "By the end of the current period"
                    : upcomingInvoice.nextPaymentAttempt
                    ? `Next payment on ${new Date(
                        upcomingInvoice.nextPaymentAttempt * 1000
                      ).toLocaleString()}`
                    : "Next payment date TBD"}
                </Typography.Text>
                <div className="mt-1" />
                <Typography.H3 className="mb-0">
                  {((upcomingInvoice.amountDue || 0) / 100).toLocaleString(
                    undefined,
                    {
                      style: "currency",
                      currency: (
                        upcomingInvoice.currency || "usd"
                      ).toUpperCase(),
                    }
                  )}
                </Typography.H3>
              </div>
            ) : (
              <Typography.Text>No upcoming invoice.</Typography.Text>
            )}
          </Card>

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
