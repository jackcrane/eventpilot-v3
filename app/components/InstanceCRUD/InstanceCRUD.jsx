import React, { useEffect, useState } from "react";
import {
  Typography,
  Input,
  Util,
  Checkbox,
  Button,
  Alert,
} from "tabler-react-2";
import { TzDateTime } from "../tzDateTime/tzDateTime";
import { InstancePicker } from "../InstancePicker/InstancePicker";
import { useInstances } from "../../hooks/useInstances";
import { useInstance } from "../../hooks/useInstance";
import toast from "react-hot-toast";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";

export const InstanceCRUD = ({
  eventId,
  instanceId = null,
  mode = null,
  close,
}) => {
  const isEdit = mode === "edit" || !!instanceId;
  const { instanceDropdownValue } = useSelectedInstance();

  // Hooks for create and edit paths
  const {
    instances,
    mutationLoading: createLoading,
    createInstance,
    validationError: createValidationError,
  } = useInstances({ eventId });

  const {
    instance,
    loading: editLoading,
    mutationLoading: updateLoading,
    validationError: editValidationError,
    updateInstance,
  } = useInstance({ eventId, instanceId: instanceId || "eventpilot__create" });

  const [state, setState] = useState({
    name: null,
    startTime: null,
    startTimeTz: null,
    endTime: null,
    endTimeTz: null,
    // create-only fields
    formField: false,
    locationJobsShifts: false,
    registrationTier: false,
    registrationPeriod: false,
    registrationPeriodPricing: false,
    upsellItem: false,
    registration: false,
    templateInstanceId: null,
  });

  // Seed state for edit
  useEffect(() => {
    if (isEdit && instance) {
      setState((s) => ({
        ...s,
        name: instance?.name ?? null,
        startTime: instance?.startTime ?? null,
        startTimeTz: instance?.startTimeTz ?? null,
        endTime: instance?.endTime ?? null,
        endTimeTz: instance?.endTimeTz ?? null,
      }));
    }
  }, [isEdit, instance]);

  // In create mode, default the template instance to whatever the InstancePicker shows by default
  // This mirrors the SelectedInstanceContext's current dropdown value when user doesn't change it
  useEffect(() => {
    if (isEdit) return;
    const preselectedId = instanceDropdownValue?.id;
    if (!state.templateInstanceId && preselectedId) {
      setState((s) =>
        s.templateInstanceId ? s : { ...s, templateInstanceId: preselectedId }
      );
    }
  }, [isEdit, instanceDropdownValue?.id, state.templateInstanceId]);

  const currentLoading = isEdit ? editLoading : false;
  const mutationLoading = isEdit ? updateLoading : createLoading;
  const validationError = isEdit ? editValidationError : createValidationError;

  const err = (k) => validationError?.[k]?._errors?.[0];

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (state.startTime && state.endTime && state.startTime > state.endTime) {
      toast.error("Start time must be before end time");
      return;
    }

    if (isEdit) {
      const success = await updateInstance({
        name: state.name,
        startTime: state.startTime,
        startTimeTz: state.startTimeTz,
        endTime: state.endTime,
        endTimeTz: state.endTimeTz,
      });
      if (success && typeof close === "function") close();
    } else {
      const res = await createInstance(state);
      const success = typeof res === "object" ? !!res?.success : !!res;
      const newId = typeof res === "object" ? res?.instance?.id : null;
      if (success) {
        if (newId) {
          try {
            localStorage.setItem("instance", newId);
          } catch {}
        }
        // Preserve existing behavior
        document.location.reload();
      }
    }
  };

  // Auto-fill dates when creating a new instance named as explicit next year
  useEffect(() => {
    if (isEdit) return; // only for create flow
    if (!state?.name || !instances?.length) return;

    const trimmed = (state.name || "").trim();
    // Only if name is exactly a 4-digit year
    const yearMatch = /^\d{4}$/.test(trimmed) ? parseInt(trimmed, 10) : null;
    if (!yearMatch) return;

    const prevYear = String(yearMatch - 1);
    const prev = instances.find((i) => (i?.name || "").trim() === prevYear);
    if (!prev) return;

    // Only auto-fill if times are not already set by the user
    const hasTimes = !!state.startTime || !!state.endTime;
    if (hasTimes) return;

    const addOneYear = (iso) => {
      try {
        if (!iso) return null;
        const d = new Date(iso);
        // Preserve month/day/time; advance calendar year
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString();
      } catch {
        return null;
      }
    };

    const nextStart = addOneYear(prev.startTime);
    const nextEnd = addOneYear(prev.endTime);
    if (nextStart && nextEnd) {
      setState((s) => ({
        ...s,
        startTime: nextStart,
        endTime: nextEnd,
        startTimeTz: prev.startTimeTz || s.startTimeTz,
        endTimeTz: prev.endTimeTz || s.endTimeTz,
      }));
    }
  }, [isEdit, state.name, instances]);

  if (currentLoading && isEdit) return null;

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">INSTANCES</Typography.H5>
      <Typography.H1>
        {isEdit ? "Edit instance" : "Create a new instance"}
      </Typography.H1>
      <Typography.Text>
        Many events occur multiple times (e.g. once-a-year, or more frequently,
        or some inconsistent cycle). EventPilot uses instances to keep records
        separate (registrations, volunteers, etc).
      </Typography.Text>

      <Util.Hr text="Basic Info" />

      <Input
        label="Instance Name"
        placeholder={`Name of the instance${
          isEdit ? "" : ` (e.g. ${new Date().getFullYear()})`
        }`}
        value={state.name}
        onChange={(v) => setState({ ...state, name: v })}
        required
        invalid={!!err("name")}
        invalidText={err("name")}
      />

      {/* Start Time */}
      <div className="mb-3">
        <TzDateTime
          label="Start Time"
          value={state.startTime}
          onChange={([dt, tz]) =>
            setState({ ...state, startTime: dt, startTimeTz: tz })
          }
          required
          tz={state.startTimeTz}
          // minDate={new Date().toISOString().slice(0, 10)}
          // minTime={new Date().toISOString().slice(11, 16)}
        />
        {(err("startTime") || err("startTimeTz")) && (
          <div className="invalid-feedback d-block">
            {err("startTime") || err("startTimeTz")}
          </div>
        )}
      </div>

      {/* End Time */}
      <div className="mb-3">
        <TzDateTime
          label="End Time"
          value={state.endTime}
          onChange={([dt, tz]) =>
            setState({ ...state, endTime: dt, endTimeTz: tz })
          }
          required
          tz={state.endTimeTz}
          // minDate={new Date().toISOString().slice(0, 10)}
          // minTime={new Date().toISOString().slice(11, 16)}
          afterLabel={
            <Button
              size="sm"
              outline
              onClick={() =>
                setState({
                  ...state,
                  endTime: state.startTime,
                  endTimeTz: state.startTimeTz,
                })
              }
            >
              Copy from Start Time
            </Button>
          }
        />
        {(err("endTime") || err("endTimeTz")) && (
          <div className="invalid-feedback d-block">
            {err("endTime") || err("endTimeTz")}
          </div>
        )}
      </div>

      {!isEdit && (
        <>
          <Util.Hr text="Clone Data" />
          <Typography.Text>
            You may want to keep some data from an existing instance.
          </Typography.Text>

          <label className="form-label">Template Instance</label>
          <InstancePicker
            eventId={eventId}
            onChange={(instance) =>
              setState({ ...state, templateInstanceId: instance.id })
            }
            selectedInstanceId={state.templateInstanceId}
            setGlobalInstance={false}
            showCreate={false}
            invalid={!!err("templateInstanceId")}
          />
          {err("templateInstanceId") && (
            <div className="invalid-feedback d-block">
              {err("templateInstanceId")}
            </div>
          )}
          <Typography.Text className="mt-1">
            This is the instance that will be the source for any cloned data.
          </Typography.Text>

          <Typography.H3>Pick what data you want to clone.</Typography.H3>

          <Checkbox
            label="Volunteer Form Fields"
            value={!!state.formField}
            onChange={(v) => setState({ ...state, formField: v })}
          />
          <Checkbox
            label="Locations, Jobs, and Shifts"
            value={!!state.locationJobsShifts}
            onChange={(v) => setState({ ...state, locationJobsShifts: v })}
          />
          <Checkbox
            label="Registration Tiers"
            value={!!state.registrationTier}
            onChange={(v) => setState({ ...state, registrationTier: v })}
          />
          <Checkbox
            label="Registration Periods"
            value={!!state.registrationPeriod}
            onChange={(v) => setState({ ...state, registrationPeriod: v })}
          />
          <Checkbox
            label="Registration Period Pricing"
            value={!!state.registrationPeriodPricing}
            onChange={(v) =>
              setState({ ...state, registrationPeriodPricing: v })
            }
          />
          <Checkbox
            label="Upsell Items"
            value={!!state.upsellItem}
            onChange={(v) => setState({ ...state, upsellItem: v })}
          />
          <Checkbox
            label="Registration Form"
            value={!!state.registration}
            onChange={(v) => setState({ ...state, registration: v })}
          />
        </>
      )}

      <Util.Hr />

      {validationError && (
        <Alert variant="danger" title="Error">
          Some data you have entered is invalid. Please correct the errors
          above.
        </Alert>
      )}

      <Button
        loading={mutationLoading}
        onClick={handleSubmit}
        variant="primary"
      >
        {isEdit ? "Save Changes" : "Create Instance"}
      </Button>
    </div>
  );
};
