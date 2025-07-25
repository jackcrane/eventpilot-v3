import React from "react";
import { Card, Button, Util, Typography } from "tabler-react-2";
import { Col, Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { CrmPersonCRUD } from "../crmPersonCRUD/crmPersonCRUD";
import { ConversationCompose } from "../ConversationCompose/ConversationCompose";
import { useConversation } from "../../hooks/useConversation";
import { useNavigate, useParams } from "react-router-dom";
import { TriPanelLayout } from "../TriPanelLayout/TriPanelLayout";
import toast from "react-hot-toast";

export const ConversationPageLayout = ({
  timeline,
  participants,
  conversationId,
}) => {
  const { eventId } = useParams();
  const {
    conversation,
    mutationLoading,
    deleteConversation,
    DeleteConfirmElement,
    sendMessage,
  } = useConversation({ eventId, conversationId });
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
    <>
      {DeleteConfirmElement}
      <TriPanelLayout
        leftIcon="activity"
        leftTitle="Quick Actions"
        leftChildren={
          <Col align="stretch" gap={1}>
            <Button onClick={() => toast.error("Coming soon!")}>
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
          </Col>
        }
        centerIcon="messages"
        centerTitle="Conversation"
        centerChildren={
          <>
            <ConversationCompose
              sendMessage={sendMessage}
              mutationLoading={mutationLoading}
              conversation={conversation}
            />
            <Util.Hr />
            {timeline}
          </>
        }
        rightIcon="users"
        rightTitle="Participants"
        rightChildren={
          <Card
            size="md"
            variantPos="top"
            tabs={participants.map((p) => ({
              title: p.name,
              content: <CrmPersonCRUD crmPersonId={p.id} key={p.id} />,
            }))}
          />
        }
      />
    </>
  );
};
