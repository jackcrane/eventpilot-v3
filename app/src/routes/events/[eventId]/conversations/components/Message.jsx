import React from "react";
import moment from "moment";
import { Card, Typography } from "tabler-react-2";
import { Row, Col } from "../../../../../../util/Flex";
import { SafeHtml } from "../../../../../../components/SafeHtml/SafeHtml";
import { Attachments } from "./Attachments";

export const Message = ({ message }) => {
  const m = message || {};

  return (
    <Card
      title={
        <Col align="flex-start" gap={0.25} style={{ width: "100%" }}>
          <Row gap={0.5} align="center" justify="space-between" style={{ width: "100%" }}>
            <Typography.H3 className="mb-0">
              <span className="text-muted">From:</span>{" "}
              {m?.headers?.from || ""}
            </Typography.H3>
          </Row>
          <Row gap={0.5} align="center">
            <Typography.Text className="mb-0 text-muted">To:</Typography.Text>
            <Typography.Text className="mb-0">{m?.headers?.to || ""}</Typography.Text>
          </Row>
          <Row gap={0.5} align="center">
            <Typography.Text className="mb-0 text-muted">Sent:</Typography.Text>
            <Typography.Text className="mb-0">
              {m?.internalDate ? moment(m.internalDate).format("MMM DD, h:mm a") : ""}
            </Typography.Text>
          </Row>
          <Attachments attachments={m?.attachments} />
        </Col>
      }
    >
      {m?.htmlBody ? (
        <SafeHtml html={m.htmlBody} />
      ) : (
        <Typography.Text style={{ whiteSpace: "pre-wrap" }}>
          {m?.textBody || m?.snippet || "(no content)"}
        </Typography.Text>
      )}
    </Card>
  );
};

