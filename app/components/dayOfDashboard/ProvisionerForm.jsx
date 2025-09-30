import { useEffect, useState } from "react";
import { PROVISIONER_PERMISSION_OPTIONS } from "../../hooks/useDayOfProvisioners";
import { ProvisionerFormLayout } from "./ProvisionerFormLayout";

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
  const fallback = PROVISIONER_PERMISSION_OPTIONS[0];
  return fallback ? [fallback] : [];
};
const computeInitialExpiryIso = (mode, provisioner) => {
  if (mode === "edit") {
    return (
      provisioner?.expiresAt ||
      buildExpiryIso(provisioner?.lastPinGeneratedAt, provisioner?.jwtExpiresInSeconds)
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
  onSubmit,
  onClose,
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

  const [saving, setSaving] = useState(false);

  const submitDisabled =
    saving || !name.trim().length || !permissions?.length || (mode === "create" && !expiryIso);

  const title =
    mode === "edit"
      ? name.trim() || provisioner?.name || "Edit provisioner"
      : "New provisioner";

  return (
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
        };
        Promise.resolve(onSubmit?.(payload))
          .finally(() => setSaving(false));
      }}
    />
  );
};
