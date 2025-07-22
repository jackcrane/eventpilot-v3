import { Card, Typography } from "tabler-react-2";
import styles from "./ConversationPageLayout.module.css";
import classNames from "classnames";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { CrmPersonCRUD } from "../crmPersonCRUD/crmPersonCRUD";

export const ConversationPageLayout = ({ timeline, actions, participants }) => {
  return (
    <div className={styles.container}>
      <div className={classNames(styles.sidebar, styles.sidebarLeft)}>
        <div className={styles.title}>
          <Row gap={1}>
            <Icon i="activity" size={18} />
            <Typography.H3 className="mb-0">Quick Actions</Typography.H3>
          </Row>
        </div>
        {actions}
      </div>
      <div style={{ flex: 1 }} className={styles.conversation}>
        <div className={styles.title}>
          <Row gap={1}>
            <Icon i="messages" size={18} />
            <Typography.H3 className="mb-0">Conversation</Typography.H3>
          </Row>
        </div>
        {timeline}
      </div>
      <div className={styles.sidebar}>
        <div className={styles.title}>
          <Row gap={1}>
            <Icon i="users" size={18} />
            <Typography.H3 className="mb-0">Participants</Typography.H3>
          </Row>
        </div>
        <Card
          size="md"
          variantPos="top"
          tabs={[
            {
              title: "Tab 1",
              content: (
                <>
                  <CrmPersonCRUD />
                </>
              ),
            },
            { title: "Tab 2", content: <p>Content of Tab 2</p> },
          ]}
        />
      </div>
    </div>
  );
};
