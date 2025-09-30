import { useCallback, useState } from "react";
import { ProvisionerForm } from "../../../../../components/dayOfDashboard/ProvisionerForm";
import { ProvisionerSuccess } from "../../../../../components/dayOfDashboard/ProvisionerSuccess";

export const useProvisionerModals = ({
  defaultTz,
  createProvisioner,
  updateProvisioner,
  offcanvas,
  close,
}) => {
  const [knownPins, setKnownPins] = useState({});
  const [shownPins, setShownPins] = useState({});

  const revealPin = useCallback((record, value) => {
    if (!value) return;
    setKnownPins((prev) => ({ ...prev, [record.id]: value }));
    setShownPins((prev) => ({ ...prev, [record.id]: true }));
  }, []);

  const openCreate = useCallback(() => {
    offcanvas({
      content: (
        <ProvisionerForm
          mode="create"
          defaultTz={defaultTz}
          onClose={close}
          onSubmit={async ({ name, permissions, expiryIso, expiryTz }) => {
            const result = await createProvisioner({
              name,
              permissions,
              expiryIso,
            });
            if (!result?.success) return;

            const created = {
              ...result.provisioner,
              name,
              permissions,
              expiresAt: expiryIso,
              expiresAtTz: expiryTz || defaultTz,
            };

            const pinValue = result.pin ?? created.pin;
            revealPin(created, pinValue);

            offcanvas({
              content: (
                <ProvisionerSuccess
                  name={created.name || "Provisioner"}
                  pin={pinValue}
                  expiryIso={created.expiresAt}
                  expiryTz={created.expiresAtTz || defaultTz}
                  onClose={close}
                />
              ),
            });
          }}
        />
      ),
    });
  }, [close, createProvisioner, defaultTz, offcanvas, revealPin]);

  const openEdit = useCallback(
    (record) => {
      offcanvas({
        content: (
          <ProvisionerForm
            mode="edit"
            provisioner={record}
            defaultTz={defaultTz}
            onClose={close}
            onSubmit={async ({ name, permissions }) => {
              const success = await updateProvisioner(record.id, {
                name,
                permissions,
              });
              if (success) close();
            }}
          />
        ),
      });
    },
    [close, defaultTz, offcanvas, updateProvisioner]
  );

  return {
    openCreate,
    openEdit,
    knownPins,
    shownPins,
    revealPin,
  };
};
