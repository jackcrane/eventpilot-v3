import { Card, Typography, Button, Util } from "tabler-react-2";
import styles from "./ConversationPageLayout.module.css";
import classNames from "classnames";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { CrmPersonCRUD } from "../crmPersonCRUD/crmPersonCRUD";
import { useState } from "react";
import { ConversationCompose } from "../ConversationCompose/ConversationCompose";
import { useConversation } from "../../hooks/useConversation";
import { useNavigate, useParams } from "react-router-dom";

export const ConversationPageLayout = ({
  timeline,
  actions,
  participants,
  conversationId,
}) => {
  const [participantsCollapsed, setParticipantsCollapsed] = useState(false);
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const { eventId } = useParams();
  const {
    conversation,
    mutationLoading,
    deleteConversation,
    DeleteConfirmElement,
    sendMessage,
  } = useConversation({
    eventId,
    conversationId,
  });
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (await deleteConversation()) {
      navigate(`/events/${eventId}/conversations`);
    }
  };

  if (!conversation?.id) {
    return (
      <div>
        <Typography.H2>Conversation not found</Typography.H2>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {DeleteConfirmElement}
      {!actionsCollapsed && (
        <div className={classNames(styles.sidebar, styles.sidebarLeft)}>
          <div className={styles.title}>
            <Row gap={1}>
              <Icon i="activity" size={18} />
              <Typography.H3 className="mb-0">Quick Actions</Typography.H3>
            </Row>
          </div>
          <div className={styles.actions}>
            <Button>
              <Row gap={1}>
                <Icon i="clipboard-plus" className="text-green" size={16} />
                Create a todo item
              </Row>
            </Button>
            <Util.Hr style={{ margin: "4px 0" }} />
            <Button
              onClick={handleDelete}
              loading={mutationLoading}
              variant="danger"
              outline
            >
              <Row gap={1}>
                <Icon i="trash" size={16} />
                Delete conversation
              </Row>
            </Button>
          </div>
        </div>
      )}
      <div style={{ flex: 1 }} className={classNames(styles.conversation)}>
        <div
          className={classNames(
            styles.title,
            actionsCollapsed && styles.hasCollapsed
          )}
        >
          <Button
            onClick={() => setActionsCollapsed(!actionsCollapsed)}
            size="sm"
            className={classNames(
              styles.collapseActions,
              actionsCollapsed && styles.collapsed
            )}
          >
            <Icon
              i={
                actionsCollapsed
                  ? "layout-sidebar-left-expand"
                  : "layout-sidebar-left-collapse"
              }
              size={16}
            />
          </Button>

          <Row gap={1}>
            <Icon i="messages" size={18} />
            <Typography.H3 className="mb-0">Conversation</Typography.H3>
          </Row>

          <Button
            onClick={() => setParticipantsCollapsed(!participantsCollapsed)}
            size="sm"
            className={classNames(
              styles.collapseParticipants,
              participantsCollapsed && styles.collapsed
            )}
          >
            <Icon
              i={
                participantsCollapsed
                  ? "layout-sidebar-right-expand"
                  : "layout-sidebar-right-collapse"
              }
              size={16}
            />
          </Button>
        </div>
        <ConversationCompose
          sendMessage={sendMessage}
          mutationLoading={mutationLoading}
          conversation={conversation}
        />
        <Util.Hr />
        {timeline}
      </div>
      {!participantsCollapsed && (
        <div className={classNames(styles.sidebar, styles.participants)}>
          <div className={styles.title}>
            <Row gap={1}>
              <Icon i="users" size={18} />
              <Typography.H3 className="mb-0">Participants</Typography.H3>
            </Row>
          </div>
          <Card
            size="md"
            variantPos="top"
            tabs={participants.map((p) => ({
              title: p.name,
              content: <CrmPersonCRUD crmPersonId={p.id} key={p.id} />,
            }))}
          />
        </div>
      )}
    </div>
  );
};
