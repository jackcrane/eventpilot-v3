import { Typography, Input, Button, EnclosedSelectGroup } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { TzDateTime } from "../tzDateTime/TzDateTime";
import { PROVISIONER_PERMISSION_OPTIONS } from "../../hooks/useDayOfProvisioners";

const READ_ONLY_OVERLAY_STYLE = {
  position: "absolute",
  inset: 0,
  pointerEvents: "all",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.6)",
};

export const ProvisionerFormLayout = ({
  mode,
  title,
  name,
  onNameChange,
  permissions,
  onPermissionsChange,
  expiryIso,
  expiryTz,
  onExpiryChange,
  readOnlyExpiry,
  saving,
  submitDisabled,
  defaultTz,
  onClose,
  onSubmit,
}) => (
  <form
    onSubmit={(event) => {
      event.preventDefault();
      if (!submitDisabled) onSubmit();
    }}
  >
    <Typography.H5 className="mb-0 text-secondary">PROVISIONER</Typography.H5>
    <Typography.H1>{title}</Typography.H1>
    <Input
      label="Name"
      value={name}
      onChange={onNameChange}
      placeholder="Door team"
      required
    />
    <label className="form-label">Permissions</label>
    <EnclosedSelectGroup
      items={PROVISIONER_PERMISSION_OPTIONS}
      value={permissions}
      onChange={onPermissionsChange}
      multiple
      direction="column"
    />
    <div className="mb-3" />
    <div style={{ position: "relative" }}>
      <TzDateTime
        value={expiryIso}
        onChange={onExpiryChange}
        label="Expiry"
        required
        tz={expiryTz || defaultTz}
        defaultTime="09:00"
        className="mb-1"
      />
      {readOnlyExpiry && <div aria-hidden style={READ_ONLY_OVERLAY_STYLE} />}
    </div>
    {readOnlyExpiry && (
      <Typography.Text className="text-muted d-block mb-3">
        Expiry can only be set when the provisioner is first created.
      </Typography.Text>
    )}
    <Row gap={0.5} justify="flex-end">
      <Button variant="subtle" onClick={onClose} type="button">
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={submitDisabled}
        loading={saving}
        variant="primary"
      >
        {mode === "edit" ? "Save changes" : "Create"}
      </Button>
    </Row>
  </form>
);
