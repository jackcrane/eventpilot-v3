import { useParams } from "react-router-dom";
import { EmailPreview } from "../../../components/emailPreview/emailPreview";
import { Typography } from "tabler-react-2";

export const EmailPage = () => {
  const { emailId } = useParams();

  return (
    <div className="p-3">
      <EmailPreview emailId={emailId} />
      <Typography.Text className="mt-3 text-muted">
        EventPilot records all emails handled by the system. This page contains
        the data that was sent. The content of this page is immutable and cannot
        be edited.
      </Typography.Text>
    </div>
  );
};
