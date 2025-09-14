import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import moment from "moment";
import { Typography, Card, Badge, Button } from "tabler-react-2";
import { Row, Col } from "../../../../../util/Flex";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";
import { useConversationThreads } from "../../../../../hooks/useConversationThreads";
import { useConversationThread } from "../../../../../hooks/useConversationThread";

export const EventConversationsPage = () => {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedThreadId = searchParams.get("threadId") || null;

  const {
    threads,
    loading: threadsLoading,
    error: threadsError,
  } = useConversationThreads({ eventId, maxResults: 20 });

  const {
    thread,
    messages,
    loading: threadLoading,
  } = useConversationThread({ eventId, threadId: selectedThreadId });

  const handleSelectThread = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("threadId", id);
    setSearchParams(next, { replace: false });
  };

  const leftList = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {threadsLoading && <Typography.Text>Loading inbox…</Typography.Text>}
      {!threadsLoading && threadsError && (
        <Typography.Text className="text-danger">
          Failed to load inbox
        </Typography.Text>
      )}
      {!threadsLoading && !threadsError && threads.length === 0 && (
        <Typography.Text className="text-muted">
          No threads found
        </Typography.Text>
      )}
      {threads.map((t) => {
        const active = t.id === selectedThreadId;
        const unread = Boolean(t.isUnread);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleSelectThread(t.id)}
            className="card"
            style={{
              textAlign: "left",
              padding: 10,
              borderColor: active ? "var(--tblr-primary)" : undefined,
              outline: "none",
              cursor: "pointer",
              width: "100%",
              display: "block",
            }}
          >
            <Row
              align="flex-start"
              gap={0.5}
              style={{ minWidth: 0, width: "100%" }}
            >
              <Col align="flex-start" style={{ minWidth: 0, width: "100%" }}>
                <Row
                  gap={0.5}
                  align="center"
                  style={{ minWidth: 0, width: "100%" }}
                >
                  {unread && (
                    <Badge color="blue" soft>
                      Unread
                    </Badge>
                  )}
                  <Typography.H3
                    className="mb-0"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {t.lastMessage?.subject || "(no subject)"}
                  </Typography.H3>
                </Row>
                <Typography.Text
                  className="mb-0 text-muted"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                >
                  {t.lastMessage?.from || ""}
                </Typography.Text>
                {t.snippet ? (
                  <Typography.Text
                    className="mb-0"
                    style={{
                      color: "var(--tblr-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {t.snippet}
                  </Typography.Text>
                ) : null}
              </Col>
              <div style={{ flex: 1 }} />
              <Typography.Text className="mb-0 text-muted">
                {t.lastMessage?.internalDate
                  ? moment(t.lastMessage.internalDate).fromNow()
                  : ""}
              </Typography.Text>
            </Row>
          </button>
        );
      })}
    </div>
  );

  const centerList = (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10 }}
    >
      {!selectedThreadId && (
        <div className="card" style={{ padding: 20 }}>
          <Typography.Text className="mb-0 text-muted">
            Select a conversation from the inbox to view messages.
          </Typography.Text>
        </div>
      )}
      {selectedThreadId && threadLoading && (
        <Typography.Text>Loading conversation…</Typography.Text>
      )}
      {selectedThreadId && !threadLoading && messages?.length === 0 && (
        <Typography.Text className="text-muted">
          No messages in this thread.
        </Typography.Text>
      )}
      {selectedThreadId &&
        !threadLoading &&
        messages?.map((m) => (
          <Card
            key={m.id}
            title={
              <Col align="flex-start" gap={0.25}>
                <Typography.H3 className="mb-0">
                  <span className="text-muted">From:</span>{" "}
                  {m.headers?.from || ""}
                </Typography.H3>
                <Row gap={0.5} align="center">
                  <Typography.Text className="mb-0 text-muted">
                    To:
                  </Typography.Text>
                  <Typography.Text className="mb-0">
                    {m.headers?.to || ""}
                  </Typography.Text>
                </Row>
                <Row gap={0.5} align="center">
                  <Typography.Text className="mb-0 text-muted">
                    Sent:
                  </Typography.Text>
                  <Typography.Text className="mb-0">
                    {m.internalDate
                      ? moment(m.internalDate).format("MMM DD, h:mm a")
                      : ""}
                  </Typography.Text>
                </Row>
                <Typography.H2 className="mb-0">
                  <span className="text-muted">Subject:</span>{" "}
                  {m.headers?.subject || "(no subject)"}
                </Typography.H2>
              </Col>
            }
          >
            {m.htmlBody ? (
              <div
                dangerouslySetInnerHTML={{ __html: m.htmlBody }}
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                }}
              />
            ) : (
              <Typography.Text style={{ whiteSpace: "pre-wrap" }}>
                {m.textBody || m.snippet || "(no content)"}
              </Typography.Text>
            )}
          </Card>
        ))}
    </div>
  );

  return (
    <EventPage
      title="Conversations"
      description="Read and manage your event inbox."
    >
      <TriPanelLayout
        leftIcon="inbox"
        leftTitle="Inbox"
        leftChildren={leftList}
        leftWidth={300}
        centerIcon="messages"
        centerTitle={thread?.subject || "Conversation"}
        centerChildren={centerList}
        rightIcon="info-circle"
        rightTitle="Details"
        rightChildren={<div />}
      />
    </EventPage>
  );
};
