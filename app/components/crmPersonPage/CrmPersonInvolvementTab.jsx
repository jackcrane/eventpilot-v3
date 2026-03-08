import { Card, Typography } from "tabler-react-2";
import { Col } from "../../util/Flex";
import styles from "./crmPersonPage.module.css";

export const CrmPersonInvolvementTab = ({
  involvement = [],
  involvementLoading = false,
}) => {
  const visibleInvolvement = involvement.filter((entry) => {
    const volunteerRegistrations =
      entry?.volunteer?.registrations?.length || 0;
    const participantRegistrations =
      entry?.participant?.registrations?.length || 0;

    return volunteerRegistrations > 0 || participantRegistrations > 0;
  });

  return (
    <div className="mt-1">
      <Typography.H2>Involvement</Typography.H2>
      <Typography.Text className="text-muted">
        Cross-instance volunteer and participant activity for this contact.
      </Typography.Text>

      <div className="mt-3" />

      {involvementLoading ? (
        <Typography.Text className="text-muted">
          Loading involvement...
        </Typography.Text>
      ) : visibleInvolvement.length ? (
        <Col gap={0.75} align="stretch">
          {visibleInvolvement.map((entry) => {
            const volunteerRegistrations =
              entry?.volunteer?.registrations?.length || 0;
            const volunteerShifts = entry?.volunteer?.shiftCount || 0;
            const participantRegistrations =
              entry?.participant?.registrations?.length || 0;

            return (
              <Card key={entry.instance.id} className={styles.instanceCard}>
                <Typography.H3 className="mb-1">{entry.instance.name}</Typography.H3>
                <Col gap={0.35} align="stretch">
                  {volunteerRegistrations ? (
                    <Typography.Text className="mb-0">
                      {volunteerShifts} shift
                      {volunteerShifts === 1 ? "" : "s"} across{" "}
                      {volunteerRegistrations} volunteer registration
                      {volunteerRegistrations === 1 ? "" : "s"}
                    </Typography.Text>
                  ) : null}
                  {participantRegistrations ? (
                    <Typography.Text className="mb-0">
                      {participantRegistrations} participant registration
                      {participantRegistrations === 1 ? "" : "s"}
                    </Typography.Text>
                  ) : null}
                </Col>
              </Card>
            );
          })}
        </Col>
      ) : (
        <Typography.Text className="text-muted">
          No involvement found across instances.
        </Typography.Text>
      )}
    </div>
  );
};
