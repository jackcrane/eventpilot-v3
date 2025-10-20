import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DropdownInput,
  Typography,
  useOffcanvas,
} from "tabler-react-2";
import { PROVISIONER_PERMISSION_OPTIONS } from "../../hooks/useDayOfProvisioners";
import { ProvisionerFormLayout } from "./ProvisionerFormLayout";
import { useStripeLocations } from "../../hooks/useStripeLocations";
import { StripeLocationForm } from "./StripeLocationForm";
import { Row } from "../../util/Flex";

const DEFAULT_TZ = "UTC";

const buildExpiryIso = (baseDate, seconds) => {
  if (!baseDate || !seconds) return null;
  const base = new Date(baseDate).getTime();
  if (Number.isNaN(base)) return null;
  return new Date(base + seconds * 1000).toISOString();
};

const computeInitialName = (provisioner) => provisioner?.name ?? "";
const optionForValue = (value) =>
  PROVISIONER_PERMISSION_OPTIONS.find((option) => option.value === value) || {
    value,
    label: value,
  };
const computeInitialPermissions = (provisioner) => {
  const source = provisioner?.permissions ?? [];
  if (source.length) return source.map(optionForValue);
  // Default to no permissions selected initially
  return [];
};
const computeInitialExpiryIso = (mode, provisioner) => {
  if (mode === "edit") {
    return (
      provisioner?.expiresAt ||
      buildExpiryIso(
        provisioner?.lastPinGeneratedAt,
        provisioner?.jwtExpiresInSeconds
      )
    );
  }
  // default to 24 hours from now for new provisioners
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
};
const computeInitialExpiryTz = (provisioner, fallbackTz) =>
  provisioner?.expiresAtTz ||
  provisioner?.startTimeTz ||
  fallbackTz ||
  DEFAULT_TZ;

export const ProvisionerForm = ({
  mode = "create",
  provisioner,
  defaultTz = DEFAULT_TZ,
  eventId,
  defaultStripeLocationId,
  onSubmit,
  onClose,
  onEndSessions,
}) => {
  const [name, setName] = useState(() => computeInitialName(provisioner));
  const [permissions, setPermissions] = useState(() =>
    computeInitialPermissions(provisioner)
  );
  const readOnlyExpiry = mode === "edit";
  const [expiryIso, setExpiryIso] = useState(() =>
    computeInitialExpiryIso(mode, provisioner)
  );
  const [expiryTz, setExpiryTz] = useState(() =>
    computeInitialExpiryTz(provisioner, defaultTz)
  );

  useEffect(() => {
    setName(computeInitialName(provisioner));
    setPermissions(computeInitialPermissions(provisioner));
    setExpiryIso(computeInitialExpiryIso(mode, provisioner));
    setExpiryTz(computeInitialExpiryTz(provisioner, defaultTz));
  }, [mode, provisioner, defaultTz]);

  const {
    locations,
    loading: locationsLoading,
    createLocation,
  } = useStripeLocations({ eventId });

  const {
    offcanvas: locationOffcanvas,
    close: closeLocationOffcanvas,
    OffcanvasElement: LocationOffcanvasElement,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 420, zIndex: 1051 },
  });

  const [selectedLocationId, setSelectedLocationId] = useState(
    () => provisioner?.stripeLocation?.id ?? null
  );
  const [locationTouched, setLocationTouched] = useState(() =>
    Boolean(provisioner?.stripeLocation?.id)
  );

  useEffect(() => {
    setSelectedLocationId(provisioner?.stripeLocation?.id ?? null);
    setLocationTouched(Boolean(provisioner?.stripeLocation?.id));
  }, [provisioner?.stripeLocation?.id, provisioner?.id]);

  useEffect(() => {
    if (locationTouched || !defaultStripeLocationId || !locations?.length) {
      return;
    }
    const match = locations.find(
      (entry) => entry.stripeLocationId === defaultStripeLocationId
    );
    if (match) {
      setSelectedLocationId(match.id);
      setLocationTouched(true);
    }
  }, [locations, defaultStripeLocationId, locationTouched]);

  const [saving, setSaving] = useState(false);
  const [endingSessions, setEndingSessions] = useState(false);

  const pointOfSaleSelected = useMemo(
    () => permissions.some((item) => item.value === "POINT_OF_SALE"),
    [permissions]
  );
  const hasValidLocation = !pointOfSaleSelected || Boolean(selectedLocationId);

  const submitDisabled =
    saving ||
    !name.trim().length ||
    !permissions?.length ||
    (mode === "create" && !expiryIso) ||
    !hasValidLocation;

  const title =
    mode === "edit"
      ? name.trim() || provisioner?.name || "Edit provisioner"
      : "New provisioner";

  const locationOptions = useMemo(() => {
    if (!locations?.length) return [];
    return locations.map((location) => ({
      id: location.id,
      value: location.id,
      label: location.nickname || location.addressLine1,
      description: `${location.addressLine1}, ${location.city}, ${location.state} ${location.postalCode}`,
    }));
  }, [locations]);

  const handleOpenLocationForm = useCallback(() => {
    if (!eventId) return;
    locationOffcanvas({
      content: (
        <StripeLocationForm
          onCancel={closeLocationOffcanvas}
          onSubmit={async (values) => {
            const location = await createLocation(values);
            if (location?.id) {
              setSelectedLocationId(location.id);
              setLocationTouched(true);
              closeLocationOffcanvas();
            }
          }}
        />
      ),
    });
  }, [closeLocationOffcanvas, createLocation, eventId, locationOffcanvas]);

  const pointOfSaleFields = useMemo(() => {
    if (!pointOfSaleSelected) return null;
    if (!eventId) {
      return (
        <Alert variant="danger" title="Event required">
          Unable to configure Stripe addresses without an event context.
        </Alert>
      );
    }
    if (locationsLoading && !locations.length) {
      return (
        <Typography.Text className="d-block my-2">
          Loading Stripe addresses…
        </Typography.Text>
      );
    }
    if (locations.length === 0) {
      return (
        <div className="mb-3 mt-3">
          <Typography.Text className="form-label required">
            Tap to pay address
          </Typography.Text>
          <Typography.Text className="d-block mb-2">
            Add a Stripe Terminal address to use Tap to Pay.
          </Typography.Text>
          <Button variant="primary" onClick={handleOpenLocationForm}>
            Add address
          </Button>
        </div>
      );
    }

    return (
      <div className="mb-3 mt-3">
        <label className="form-label">Tap to pay address</label>
        <DropdownInput
          items={locationOptions}
          value={selectedLocationId}
          onChange={(item) => {
            setSelectedLocationId(item.value);
            setLocationTouched(true);
          }}
          prompt="Select an address"
          required
          aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
        />
        <Button
          variant="subtle"
          type="button"
          className="mt-2"
          onClick={handleOpenLocationForm}
        >
          Add new address
        </Button>
        {!hasValidLocation && (
          <Typography.Text className="text-danger">
            Select an address to finish enabling point of sale.
          </Typography.Text>
        )}
      </div>
    );
  }, [
    eventId,
    handleOpenLocationForm,
    hasValidLocation,
    locations,
    locationsLoading,
    locationOptions,
    pointOfSaleSelected,
    selectedLocationId,
  ]);

  return (
    <>
      <ProvisionerFormLayout
        mode={mode}
        title={title}
        name={name}
        onNameChange={setName}
        permissions={permissions}
        onPermissionsChange={(next) => setPermissions(next || [])}
        expiryIso={expiryIso}
        expiryTz={expiryTz}
        onExpiryChange={([iso, tz]) => {
          if (readOnlyExpiry) return;
          setExpiryIso(iso);
          setExpiryTz(tz);
        }}
        readOnlyExpiry={readOnlyExpiry}
        saving={saving}
        submitDisabled={submitDisabled}
        defaultTz={defaultTz || DEFAULT_TZ}
        onClose={onClose}
        onSubmit={() => {
          setSaving(true);
          const payload = {
            name,
            permissions: permissions.map((item) => item.value),
            expiryIso,
            expiryTz,
            stripeLocationId: pointOfSaleSelected ? selectedLocationId : null,
          };
          Promise.resolve(onSubmit?.(payload)).finally(() => setSaving(false));
        }}
        onEndSessions={
          mode === "edit" && onEndSessions && provisioner?.id
            ? async () => {
                if (endingSessions) return;
                setEndingSessions(true);
                try {
                  await onEndSessions();
                } finally {
                  setEndingSessions(false);
                }
              }
            : undefined
        }
        endSessionsDisabled={endingSessions || saving}
        endSessionsLoading={endingSessions}
      >
        {pointOfSaleFields}
      </ProvisionerFormLayout>
      {LocationOffcanvasElement}
    </>
  );
};
