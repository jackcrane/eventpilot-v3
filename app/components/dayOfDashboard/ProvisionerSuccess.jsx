import { Typography, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { formatDate } from "../tzDateTime/TzDateTime";

const PIN_STYLE = {
  fontSize: 48,
  fontWeight: 600,
  letterSpacing: 6,
  textAlign: "center",
  marginBottom: 16,
};

export const ProvisionerSuccess = ({ name, pin, expiryIso, expiryTz, onClose }) => {
  const safeName = name || "Provisioner";
  const zone = expiryTz || "UTC";
  const expiresDescription = expiryIso ? formatDate(expiryIso, zone) : null;

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">PROVISIONER</Typography.H5>
      <Typography.H1>{safeName}</Typography.H1>
      <Typography.Text className="d-block mb-3">
        Share this PIN with the provisioner. They will need it to sign in on the day of your event.
      </Typography.Text>
      <div style={PIN_STYLE}>{pin}</div>
      {expiresDescription && (
        <Typography.Text className="text-muted d-block mb-3">
          Token sessions issued from this provisioner will expire around {expiresDescription}.
        </Typography.Text>
      )}
      <Row gap={0.5} justify="flex-end">
        <Button variant="subtle" onClick={onClose}>
          Close
        </Button>
      </Row>
    </div>
  );
};
