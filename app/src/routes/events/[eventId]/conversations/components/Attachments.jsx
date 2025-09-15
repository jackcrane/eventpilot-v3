import React from "react";
import { Typography } from "tabler-react-2";
import { Row, Col } from "../../../../../../util/Flex";
import { Icon } from "../../../../../../util/Icon";

// Local helper to format bytes into human-friendly units
const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs < 1024) return `${n} b`;
  const kb = n / 1024;
  if (abs < 1024 * 1024)
    return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1)} kb`;
  const mb = n / (1024 * 1024);
  if (abs < 1024 * 1024 * 1024)
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} mb`;
  const gb = n / (1024 * 1024 * 1024);
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} gb`;
};

export const Attachments = ({ attachments }) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;

  return (
    <>
      <Typography.Text className="mb-0">
        <span className="text-muted">Attachments:</span>{" "}
      </Typography.Text>
      <Row
        gap={1}
        align="flex-start"
        style={{ overflowX: "auto", paddingBottom: 4, width: "100%" }}
      >
        {attachments.map((a) => {
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
                flex: "0 0 auto",
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
                    style={{ maxWidth: 120, maxHeight: 120, objectFit: "cover", borderRadius: 4 }}
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
                    {typeof a?.size === "number" ? `, ${formatBytes(a.size)}` : ""}
                  </Typography.Text>
                </Col>
              </Row>
            </a>
          );
        })}
      </Row>
    </>
  );
};

