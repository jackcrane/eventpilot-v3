import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashLedger } from "../../hooks/useDashLedger";

export const LedgerSummaryCard = () => {
  const { eventId } = useParams();
  const { ledgerTotal, trend, loading } = useDashLedger({ eventId });

  if (loading) return null;

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(ledgerTotal || 0));

  return (
    <Card title="Ledger" style={{ width: 300, minWidth: 300 }}>
      <DataBox title="Total Amount" value={formatted} trend={trend} />
      <Typography.Text>
        This is the total amount of money collected in this instance. Details
        can be found in the Financials tab.
      </Typography.Text>
    </Card>
  );
};
