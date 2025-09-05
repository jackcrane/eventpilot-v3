import { Card, Typography, Badge, Spinner } from "tabler-react-2";
import { useCrmLedger } from "../../hooks/useCrmLedger";
import { Row, Col } from "../../util/Flex";

export const FinancialCrmPage = ({ crmPerson }) => {
  const eventId = crmPerson?.eventId;
  const personId = crmPerson?.id;
  const { ledgerItems, lifetimeValue, loading } = useCrmLedger({
    eventId,
    personId,
  });

  const formattedLTV = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(lifetimeValue || 0));

  return (
    <div className="mt-1">
      <Typography.H2>Financial</Typography.H2>

      <Card className="mb-2">
        <Row justify="space-between" align="center">
          <Typography.H3 className="mb-0">Lifetime Value</Typography.H3>
          <Typography.H3 className="mb-0">{formattedLTV}</Typography.H3>
        </Row>
      </Card>

      <Card title="Ledger Items">
        {loading ? (
          <Row justify="center" className="py-4">
            <Spinner />
          </Row>
        ) : ledgerItems.length === 0 ? (
          <Typography.Text className="text-muted">
            No ledger items for this contact.
          </Typography.Text>
        ) : (
          <Col gap={0.5}>
            {ledgerItems.map((li) => {
              const amount = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              }).format(Number(li.amount || 0));
              const originalDifferent =
                li.originalAmount != null &&
                Number(li.originalAmount) !== Number(li.amount);
              return (
                <Row
                  key={li.id}
                  align="center"
                  justify="space-between"
                  className="py-1"
                >
                  <Col>
                    <Row gap={0.5} align="center">
                      <Badge soft>{li.source}</Badge>
                      <Typography.Text className="mb-0">
                        {new Date(li.createdAt).toLocaleString()}
                      </Typography.Text>
                    </Row>
                    {originalDifferent && (
                      <Typography.Text className="mb-0 text-secondary">
                        Original: {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 2,
                        }).format(Number(li.originalAmount || 0))}
                      </Typography.Text>
                    )}
                  </Col>
                  <Typography.H4 className="mb-0">{amount}</Typography.H4>
                </Row>
              );
            })}
          </Col>
        )}
      </Card>
    </div>
  );
};
