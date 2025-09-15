import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import moment from "moment";
import { Typography, Card, Badge, Button } from "tabler-react-2";
import { Row, Col } from "../../../../../util/Flex";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";
import { useConversationThreads } from "../../../../../hooks/useConversationThreads";
import { useConversationThread } from "../../../../../hooks/useConversationThread";
import { Icon } from "../../../../../util/Icon";
import { Loading } from "../../../../../components/loading/Loading";
import { Empty } from "../../../../../components/empty/Empty";

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

  const sortedThreads = useMemo(() => {
    if (!threads?.length) return [];
    return [...threads].sort((a, b) => {
      const ad = new Date(a?.lastMessage?.internalDate || a?.lastInternalDate || 0).getTime();
      const bd = new Date(b?.lastMessage?.internalDate || b?.lastInternalDate || 0).getTime();
      return bd - ad; // newest first
    });
  }, [threads]);

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
      {threadsLoading && (
        <Loading title="Loading inbox" text="Fetching your threads…" gradient={false} />
      )}
      {!threadsLoading && threadsError && (
        <Typography.Text className="text-danger">
          Failed to load inbox
        </Typography.Text>
      )}
      {!threadsLoading && !threadsError && sortedThreads.length === 0 && (
        <Empty title="No conversations" text="You don't have any conversations yet." gradient={false} />
      )}
      {sortedThreads.map((t) => {
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

  const sortedMessages = useMemo(() => {
    if (!messages?.length) return [];
    return [...messages].sort((a, b) => {
      const ad = new Date(a?.internalDate || 0).getTime();
      const bd = new Date(b?.internalDate || 0).getTime();
      return bd - ad; // newest first
    });
  }, [messages]);

  const centerList = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!selectedThreadId && (
        <Empty
          title="No conversation selected"
          text="Select a conversation from the inbox to view messages."
          gradient={false}
        />
      )}
      {selectedThreadId && threadLoading && (
        <Loading title="Loading conversation" text="Fetching messages…" gradient={false} />
      )}
      {selectedThreadId && !threadLoading && messages?.length === 0 && (
        <Empty title="No messages" text="This conversation has no messages." gradient={false} />
      )}
      {selectedThreadId && !threadLoading &&
        sortedMessages.map((m) => (
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

            {Array.isArray(m.attachments) && m.attachments.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <Typography.Text className="mb-0">
                  <span className="text-muted">Attachments:</span>{" "}
                </Typography.Text>
                <Row gap={1} align="flex-start">
                  {m.attachments.map((a) => {
                    const isImage = String(a?.mimeType || "").startsWith("image/");
                    const label = a?.filename || "attachment";
                    return (
                      <a
                        key={a.attachmentId}
                        href={a.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card"
                        style={{
                          padding: 8,
                          maxWidth: 520,
                          overflow: "hidden",
                          display: "inline-block",
                          boxShadow: "none",
                          transition: "none",
                          textDecoration: "none",
                          filter: "none",
                        }}
                        title={label}
                      >
                        <Row gap={1} align="center">
                          {isImage ? (
                            <img
                              src={a.downloadUrl}
                              alt={label}
                              style={{
                                maxWidth: 120,
                                maxHeight: 120,
                                objectFit: "cover",
                                borderRadius: 4,
                              }}
                            />
                          ) : (
                            <Icon i="file" size={48} />
                          )}
                          <Col gap={0.25} align="flex-start">
                            <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
                              {label}
                            </Typography.Text>
                            <Typography.Text className="mb-0 text-muted" style={{ textAlign: "left" }}>
                              {a?.mimeType || ""}
                              {typeof a?.size === "number" ? `, ${a.size} bytes` : ""}
                            </Typography.Text>
                          </Col>
                        </Row>
                      </a>
                    );
                  })}
                </Row>
              </div>
            ) : null}
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
