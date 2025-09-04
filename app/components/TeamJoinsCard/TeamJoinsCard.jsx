import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashTeamJoins } from "../../hooks/useDashTeamJoins";

export const TeamJoinsCard = () => {
  const { eventId } = useParams();
  const { totalOnTeams, trend, loading } = useDashTeamJoins({ eventId });

  if (loading) return null;

  const formatted = new Intl.NumberFormat("en-US").format(Number(totalOnTeams || 0));

  return (
    <Card title="Team Joins" style={{ width: 300, minWidth: 300 }}>
      <DataBox title="Participants on Teams" value={formatted} trend={trend} />
      <Typography.Text>
        Finalized registrations with a team for this instance.
      </Typography.Text>
    </Card>
  );
};
