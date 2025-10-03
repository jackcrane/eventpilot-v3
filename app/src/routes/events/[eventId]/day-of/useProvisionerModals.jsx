import { useCallback, useState } from "react";
import { ProvisionerForm } from "../../../../../components/dayOfDashboard/ProvisionerForm";
import { ProvisionerSuccess } from "../../../../../components/dayOfDashboard/ProvisionerSuccess";
import { useConfirm } from "tabler-react-2";

export const useProvisionerModals = ({
  defaultTz,
  createProvisioner,
  updateProvisioner,
  endProvisionerSessions,
  offcanvas,
  close,
}) => {
  const [knownPins, setKnownPins] = useState({});
  const [shownPins, setShownPins] = useState({});

  const { confirm: confirmEndSessions, ConfirmModal: EndSessionsConfirmModal } = useConfirm({
    title: "End all sessions",
    commitText: "End sessions",
    cancelText: "Cancel",
    confirmVariant: "danger",
  });

  const buildEndSessionsText = useCallback((record) => {
    const count = record?.accountCount ?? 0;
    if (count <= 0) {
      return "This will invalidate any current sessions from this provisioner. Devices will need to sign in again with a new PIN.";
    }
    const plural = count === 1 ? "session" : "sessions";
    return `You are about to end ${count} ${plural}. Those devices will be signed out immediately and must sign in again with a new PIN.`;
  }, []);

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
            onEndSessions={async () => {
              if (!confirmEndSessions) return;
              const confirmed = await confirmEndSessions({
                text: buildEndSessionsText(record),
              });
              if (!confirmed) return;
              const result = await endProvisionerSessions(record.id);
              if (result?.success) {
                close();
              }
            }}
          />
        ),
      });
    },
    [
      buildEndSessionsText,
      close,
      confirmEndSessions,
      defaultTz,
      endProvisionerSessions,
      offcanvas,
      updateProvisioner,
    ]
  );

  return {
    openCreate,
    openEdit,
    knownPins,
    shownPins,
    revealPin,
    EndSessionsConfirmModal,
  };
};
