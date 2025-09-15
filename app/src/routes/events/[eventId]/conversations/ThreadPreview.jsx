import React from "react";
import moment from "moment";
import { Typography, Badge } from "tabler-react-2";
import { Row, Col } from "../../../../../util/Flex";
import { Icon } from "../../../../../util/Icon";

export const ThreadPreview = ({ thread, active, onClick, highlightText }) => {
  if (!thread) return null;
  const unread = Boolean(thread.isUnread);
  const attachmentsCount =
    typeof thread?.attachmentsCount === "number"
      ? thread.attachmentsCount
      : Array.isArray(thread?.matchedAttachments)
      ? thread.matchedAttachments.length
      : 0;

  return (
    <button
      type="button"
      onClick={onClick}
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
      <Row align="flex-start" gap={0.5} style={{ minWidth: 0, width: "100%" }}>
        <Col align="flex-start" style={{ minWidth: 0, width: "100%" }}>
          <Row
            gap={0.5}
            align="center"
            justify="space-between"
            style={{ minWidth: 0, width: "100%" }}
          >
            <Row
              gap={0.5}
              align="center"
              style={{ minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}
            >
              {unread && (
                <span
                  aria-label="unread"
                  title="Unread"
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 9999,
                    background: "var(--tblr-primary)",
                    flex: "0 0 auto",
                  }}
                />
              )}
              <Typography.H3
                className="mb-0"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  flex: "1 1 auto",
                }}
              >
                {highlightText(thread.lastMessage?.subject || "(no subject)")}
              </Typography.H3>
              {attachmentsCount > 0 ? (
                <Badge soft title={`${attachmentsCount} attachment${attachmentsCount === 1 ? "" : "s"}`}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon i="paperclip" /> {attachmentsCount}
                  </span>
                </Badge>
              ) : null}
            </Row>
            <Typography.Text
              className="mb-0 text-muted"
              style={{ marginLeft: 8, textAlign: "right", whiteSpace: "nowrap", flex: "0 0 auto" }}
            >
              {thread.lastMessage?.internalDate ? moment(thread.lastMessage.internalDate).fromNow() : ""}
            </Typography.Text>
          </Row>

          <Typography.Text
            className="mb-0 text-muted"
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
          >
            {highlightText(thread.lastMessage?.from || "")}
          </Typography.Text>
          {thread.snippet ? (
            <Typography.Text
              className="mb-0"
              style={{ color: "var(--tblr-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
            >
              {highlightText(thread.snippet)}
            </Typography.Text>
          ) : null}
          {Array.isArray(thread.matchedAttachments) && thread.matchedAttachments.length > 0 ? (
            <Typography.Text
              className="mb-0"
              style={{ color: "var(--tblr-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
            >
              <span className="text-muted">Attachments: </span>
              {thread.matchedAttachments.map((name, idx) => (
                <React.Fragment key={`${thread.id}-att-${idx}`}>
                  {idx > 0 ? ", " : null}
                  {highlightText(name)}
                </React.Fragment>
              ))}
            </Typography.Text>
          ) : null}
        </Col>
      </Row>
    </button>
  );
};

