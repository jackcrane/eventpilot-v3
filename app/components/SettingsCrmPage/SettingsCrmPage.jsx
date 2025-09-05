import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Util, Button } from "tabler-react-2";
import { useCrm } from "../../hooks/useCrm";
import { useCrmPerson } from "../../hooks/useCrmPerson";
import { BasicInfo } from "../crmPersonCRUD/BasicInfo";
import { CustomFields } from "../crmPersonCRUD/crmPersonCRUD";

export const SettingsCrmPage = ({ crmPerson }) => {
  const { eventId, personId } = useParams();
  const { crmFields, loading: fieldsLoading } = useCrm({ eventId });
  const { updateCrmPerson, mutationLoading } = useCrmPerson({
    eventId,
    personId,
  });

  const [localCrmPerson, setLocalCrmPerson] = useState(crmPerson);

  useEffect(() => {
    setLocalCrmPerson(crmPerson);
  }, [crmPerson]);

  const handleSave = async () => {
    if (!localCrmPerson) return;

    const payload = { ...localCrmPerson };

    // Normalize emails: keep filled entries and map to { id?, label, email }
    payload.emails = (payload.emails || [])
      .filter((e) => (e?.email || "").trim().length > 0)
      .map((e) => ({ id: e.id, label: e.label || "", email: e.email }));

    // Normalize phones: keep filled entries and map to { id?, label, phone }
    payload.phones = (payload.phones || [])
      .filter((p) => (p?.phone || "").trim().length > 0)
      .map((p) => ({ id: p.id, label: p.label || "", phone: p.phone }));

    // Flatten custom fields object to array of { id, value }
    if (payload.fields && typeof payload.fields === "object") {
      payload.fields = Object.entries(payload.fields).map(([id, value]) => ({
        id,
        value: value ?? "",
      }));
    } else {
      payload.fields = [];
    }

    await updateCrmPerson(payload);
  };

  return (
    <div className="mt-1">
      <Typography.H2 className="mb-2">Settings</Typography.H2>

      <Util.Hr text="Basic Info" />
      <BasicInfo
        localCrmPerson={localCrmPerson}
        setLocalCrmPerson={setLocalCrmPerson}
      />

      <Util.Hr text="Custom Fields" />
      {!fieldsLoading && crmFields && (
        <CustomFields
          crmFields={crmFields}
          localCrmPerson={localCrmPerson}
          setLocalCrmPerson={setLocalCrmPerson}
        />
      )}

      <Util.Hr text="Actions" />
      <Button onClick={handleSave} loading={mutationLoading} variant="primary">
        Save Changes
      </Button>
    </div>
  );
};
