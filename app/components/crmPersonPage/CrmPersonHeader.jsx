import { Avatar, Button, Card, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import styles from "./crmPersonPage.module.css";
import { extractInitials } from "./crmPersonPageUtils";

const MetricCard = ({ icon, label, value, helper }) => (
  <div className={styles.metricCard}>
    <div className={styles.metricIcon}>
      <Icon i={icon} size={18} />
    </div>
    <div>
      <Typography.Text className="text-muted mb-0">{label}</Typography.Text>
      <Typography.H3 className="mb-0">{value}</Typography.H3>
      {helper ? (
        <Typography.Text className="text-muted mb-0">{helper}</Typography.Text>
      ) : null}
    </div>
  </div>
);

export const CrmPersonHeader = ({
  crmPerson,
  primaryPhone,
  stats,
  lastTouchLabel,
}) => (
  <Card className={styles.heroCard}>
    <div className={styles.heroTop}>
      <div className={styles.heroIdentity}>
        <Avatar
          size="xl"
          initials={extractInitials(crmPerson?.name)}
          className={styles.heroAvatar}
        />
        <div className={styles.heroText}>
          <Row gap={0.5} align="center" className="mb-1">
            <Typography.H1 className="mb-0">
              {crmPerson?.name || "Contact"}
            </Typography.H1>
          </Row>
          <Row gap={0.5} align="center" className={styles.heroMetaRow}>
            <Typography.Text className="text-muted mb-0">
              Last touch {lastTouchLabel}
            </Typography.Text>
          </Row>
          <div className={styles.heroContactRow}>
            {primaryPhone?.phone ? (
              <a
                href={`tel:${primaryPhone.phone}`}
                className={styles.contactPill}
              >
                <Icon i="phone" size={16} />
                <span>{primaryPhone.phone}</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.heroActions}>
        {primaryPhone?.phone ? (
          <Button href={`tel:${primaryPhone.phone}`} outline size="sm">
            <Icon i="phone-call" /> Call
          </Button>
        ) : null}
      </div>
    </div>

    <div className={styles.metricsGrid}>
      {stats.map((stat) => (
        <MetricCard key={stat.label} {...stat} />
      ))}
    </div>
  </Card>
);
