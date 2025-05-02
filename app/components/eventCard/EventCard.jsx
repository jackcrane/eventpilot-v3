import { Card, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Link } from "react-router-dom";
import styles from "./eventcard.module.css";

export const EventCard = ({ event }) => {
  return (
    <Link to={`/${event.id}`} className={styles.eventCard}>
      <Card size="sm">
        <Row gap={1}>
          <img
            src={event.logo?.location}
            alt="Event Logo"
            style={{
              height: 50,
              width: 50,
              objectFit: "cover",
              borderRadius: 5,
            }}
          />
          <div>
            <Typography.H3 className={"mb-0"}>{event.name}</Typography.H3>
            <Typography.Text className={"mb-0"}>
              {event.description}
            </Typography.Text>
          </div>
        </Row>
      </Card>
    </Link>
  );
};
