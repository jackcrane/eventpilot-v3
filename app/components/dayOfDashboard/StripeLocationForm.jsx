import { useState } from "react";
import { Button, Input, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";

const normalize = (value) => value?.trim() || "";

export const StripeLocationForm = ({
  onSubmit,
  onCancel,
  saving = false,
}) => {
  const [nickname, setNickname] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [internalSaving, setInternalSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || internalSaving) return;
    setInternalSaving(true);
    try {
      await onSubmit?.({
        nickname: normalize(nickname) || null,
        addressLine1: normalize(addressLine1),
        addressLine2: normalize(addressLine2) || null,
        city: normalize(city),
        state: normalize(state),
        postalCode: normalize(postalCode),
      });
    } finally {
      setInternalSaving(false);
    }
  };

  const submitDisabled =
    saving ||
    internalSaving ||
    !normalize(addressLine1) ||
    !normalize(city) ||
    !normalize(state) ||
    !normalize(postalCode);

  return (
    <form onSubmit={handleSubmit}>
      <Typography.H5 className="mb-0 text-secondary">POINT OF SALE</Typography.H5>
      <Typography.H2>Add Stripe address</Typography.H2>

      <Input
        label="Nickname"
        placeholder="Main Hall"
        value={nickname}
        onChange={setNickname}
      />
      <Input
        label="Address line 1"
        placeholder="123 Event Blvd."
        required
        value={addressLine1}
        onChange={setAddressLine1}
      />
      <Input
        label="Address line 2"
        placeholder="Suite 300"
        value={addressLine2}
        onChange={setAddressLine2}
      />
      <Input
        label="City"
        placeholder="San Francisco"
        required
        value={city}
        onChange={setCity}
      />
      <Row gap={1}>
        <Input
          label="State"
          placeholder="CA"
          required
          value={state}
          onChange={setState}
        />
        <Input
          label="Postal code"
          placeholder="94103"
          required
          value={postalCode}
          onChange={setPostalCode}
        />
      </Row>
      <Typography.Text className="text-muted d-block mb-3">
        Country is set to United States for Stripe Terminal Tap to Pay.
      </Typography.Text>
      <Row gap={0.5} justify="flex-end">
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={saving || internalSaving}
          disabled={submitDisabled}
        >
          Save address
        </Button>
      </Row>
    </form>
  );
};
