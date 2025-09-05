import { useMemo } from "react";
import { Typography, Util } from "tabler-react-2";
import { Col } from "../../util/Flex";
import { EmailPreviewPrompt } from "../emailPreview/emailPreview";

export const EmailsCrmPage = ({ crmPerson }) => {
  const emails = useMemo(() => {
    if (!crmPerson) return [];
    const inbound = (crmPerson.inboundEmails || []).map((e) => ({
      id: e.id,
      createdAt: e.createdAt || e.receivedAt,
    }));
    const sent = (crmPerson.sentEmails || []).map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
    }));
    return [...inbound, ...sent].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [crmPerson]);

  return (
    <div className="mt-1">
      <Typography.H2>Emails</Typography.H2>
      <Util.Hr />
      {emails.length === 0 ? (
        <Typography.Text className="text-muted">
          No emails associated with this person yet.
        </Typography.Text>
      ) : (
        <Col gap={0.75}>
          {emails.map((e) => (
            <EmailPreviewPrompt
              key={e.id}
              emailId={e.id}
              onClick={() => {
                // Placeholder action for click
                // eslint-disable-next-line no-console
                console.log("Email clicked", e.id);
              }}
            />
          ))}
        </Col>
      )}
    </div>
  );
};
