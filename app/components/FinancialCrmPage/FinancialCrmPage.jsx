import { Card, Typography, Badge, Spinner } from "tabler-react-2";
import { useCrmLedger } from "../../hooks/useCrmLedger";
import { Row, Col } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { useMemo } from "react";

export const FinancialCrmPage = ({ crmPerson }) => {
  const eventId = crmPerson?.eventId;
  const personId = crmPerson?.id;
  const { ledgerItems, lifetimeValue, loading } = useCrmLedger({
    eventId,
    personId,
  });

  // Removed segmented control/filtering per design feedback

  const formattedLTV = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(lifetimeValue || 0));

  // Helpers
  const fmtCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const fmtDateTime = (date) =>
    new Date(date).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const monthLabel = (date) =>
    new Date(date).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });

  const sourceMeta = (source, amount, adjusted) => {
    const s = String(source || "").toLowerCase();
    let icon = "cash";
    let label = source || "Payment";
    if (s.includes("stripe")) {
      icon = "brand-stripe";
      label = "Stripe";
    } else if (s.includes("coupon") || s.includes("discount")) {
      icon = "discount-2";
      label = "Discount";
    } else if (s.includes("refund")) {
      icon = "receipt-refund";
      label = "Refund";
    } else if (s.includes("registration")) {
      icon = "ticket";
      label = "Registration";
    } else if (s.includes("manual") || s.includes("adjust")) {
      icon = "adjustments";
      label = adjusted ? "Adjustment" : "Manual";
    }
    const positive = Number(amount || 0) > 0;
    const negative = Number(amount || 0) < 0;
    const color = positive
      ? "var(--tblr-success)"
      : negative
      ? "var(--tblr-danger)"
      : undefined;
    return { icon, label, color };
  };

  // Derived
  const filteredItems = useMemo(() => {
    // Always show all items (no segmented control)
    if (!Array.isArray(ledgerItems)) return [];
    return ledgerItems;
  }, [ledgerItems]);

  const grouped = useMemo(() => {
    const groups = new Map();
    filteredItems.forEach((li) => {
      const label = monthLabel(li.createdAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(li);
    });
    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [filteredItems]);

  const totalTx = ledgerItems?.length || 0;
  const lastDate = ledgerItems?.[0]?.createdAt;

  return (
    <div className="mt-1">
      <Typography.H2>Financial</Typography.H2>

      <Card title="Overview" className="mb-2">
        <Row justify="space-between" align="center">
          <Col>
            <Typography.Text className="text-secondary mb-0">
              Lifetime Value
            </Typography.Text>
            <Typography.H3 className="mb-0">{formattedLTV}</Typography.H3>
          </Col>
          <Col>
            <Typography.Text className="text-secondary mb-0">
              Transactions
            </Typography.Text>
            <Typography.H3 className="mb-0">{totalTx}</Typography.H3>
          </Col>
          <Col>
            <Typography.Text className="text-secondary mb-0">
              Last Activity
            </Typography.Text>
            <Typography.H4 className="mb-0">
              {lastDate ? new Date(lastDate).toLocaleDateString() : "—"}
            </Typography.H4>
          </Col>
        </Row>
      </Card>

      <Card title="Ledger">
        {loading ? (
          <Row justify="flex-start" className="py-4">
            <Spinner />
          </Row>
        ) : ledgerItems.length === 0 ? (
          <Typography.Text className="text-muted">
            No ledger items for this contact.
          </Typography.Text>
        ) : (
          <Col>
            {grouped.map((group) => (
              <div
                key={group.label}
                style={{
                  width: "100%",
                }}
              >
                <Row
                  justify="space-between"
                  align="flex-start"
                  className="mt-1 mb-1"
                >
                  <Typography.H4 className="mb-0 text-secondary">
                    {group.label}
                  </Typography.H4>
                  <Typography.Text className="mb-0 text-muted">
                    {group.items.length} item
                    {group.items.length === 1 ? "" : "s"}
                  </Typography.Text>
                </Row>
                <Col className="mb-2">
                  {group.items.map((li, idx) => {
                    const originalDifferent =
                      li.originalAmount != null &&
                      Number(li.originalAmount) !== Number(li.amount);
                    const amount = fmtCurrency(li.amount);
                    const meta = sourceMeta(
                      li.source,
                      li.amount,
                      originalDifferent
                    );
                    const negative = Number(li.amount || 0) < 0;
                    return (
                      <Row
                        key={li.id}
                        align="flex-start"
                        justify="space-between"
                        className={
                          "py-2" +
                          (idx < group.items.length - 1 ? " border-bottom" : "")
                        }
                        style={{ width: "100%" }}
                      >
                        <Row gap={0.75} align="flex-start">
                          <Icon i={meta.icon} size={20} color={meta.color} />
                          <Col align="flex-start">
                            <Row gap={0.5} align="flex-start">
                              <Typography.H5 className="mb-0">
                                {meta.label}
                              </Typography.H5>
                              <Badge soft>{li.source}</Badge>
                              {originalDifferent && (
                                <Badge color="yellow" soft>
                                  Adjusted
                                </Badge>
                              )}
                            </Row>
                            <Row gap={0.5} align="flex-start">
                              <Typography.Text className="mb-0 text-muted">
                                {fmtDateTime(li.createdAt)}
                              </Typography.Text>
                              {li.registrationId && (
                                <Badge outline>
                                  Reg {String(li.registrationId).slice(0, 6)}
                                </Badge>
                              )}
                            </Row>
                            {originalDifferent && (
                              <Typography.Text className="mb-0 text-secondary">
                                Original {fmtCurrency(li.originalAmount)}
                              </Typography.Text>
                            )}
                          </Col>
                        </Row>
                        <Col style={{ alignItems: "flex-end" }}>
                          <Typography.H4
                            className={
                              "mb-0 font-monospace " +
                              (negative ? "text-danger" : "text-success")
                            }
                          >
                            {amount}
                          </Typography.H4>
                        </Col>
                      </Row>
                    );
                  })}
                </Col>
              </div>
            ))}
          </Col>
        )}
      </Card>
    </div>
  );
};
