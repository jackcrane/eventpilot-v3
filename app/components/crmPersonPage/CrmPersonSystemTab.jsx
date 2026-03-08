import { Badge, Card, Typography } from "tabler-react-2";
import { Col } from "../../util/Flex";
import styles from "./crmPersonPage.module.css";
import { formatDateTime } from "./crmPersonPageUtils";

export const CrmPersonSystemTab = ({ crmPerson, sourceLabel }) => (
  <div className="mt-1">
    <Typography.H2>System</Typography.H2>
    <Typography.Text className="text-muted">
      Internal identifiers and lifecycle metadata for this CRM person.
    </Typography.Text>

    <div className="mt-3" />

    <Card>
      <Col gap={0.75} align="stretch">
        <div className={styles.fieldRow}>
          <Typography.Text className="text-muted mb-0">Source</Typography.Text>
          <Badge outline>{sourceLabel}</Badge>
        </div>
        <div className={styles.fieldRow}>
          <Typography.Text className="text-muted mb-0">CRM ID</Typography.Text>
          <code className={styles.codeValue}>{crmPerson?.id}</code>
        </div>
        <div className={styles.fieldRow}>
          <Typography.Text className="text-muted mb-0">
            Stripe customer
          </Typography.Text>
          <code className={styles.codeValue}>
            {crmPerson?.stripe_customerId || "None"}
          </code>
        </div>
        <div className={styles.fieldRow}>
          <Typography.Text className="text-muted mb-0">Created</Typography.Text>
          <Typography.Text className="mb-0">
            {formatDateTime(crmPerson?.createdAt)}
          </Typography.Text>
        </div>
        <div className={styles.fieldRow}>
          <Typography.Text className="text-muted mb-0">Updated</Typography.Text>
          <Typography.Text className="mb-0">
            {formatDateTime(crmPerson?.updatedAt)}
          </Typography.Text>
        </div>
      </Col>
    </Card>
  </div>
);
