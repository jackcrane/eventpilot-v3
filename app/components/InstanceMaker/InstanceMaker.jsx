import React, { useState } from "react";
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
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";
import toast from "react-hot-toast";

export const InstanceMaker = ({ eventId, close }) => {
  const [state, setState] = useState({
    name: null,
    startTime: null,
    startTimeTz: null,
    endTime: null,
    endTimeTz: null,
    formField: false,
    locationJobsShifts: false,
    registrationTier: false,
    registrationPeriod: false,
    registrationPeriodPricing: false,
    upsellItem: false,
    registration: false,
  });
  const { mutationLoading, createInstance, validationError } = useInstances({
    eventId,
  });
  const { setInstance } = useSelectedInstance();

  const err = (k) => validationError?.[k]?._errors?.[0];

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (state.startTime > state.endTime) {
      toast.error("Start time must be before end time");
      return;
    }

    const success = await createInstance(state);

    if (success) {
      document.location.reload();
    }
  };

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">INSTANCES</Typography.H5>
      <Typography.H1>Make an instance</Typography.H1>
      <Typography.Text>
        Many events occur multiple times (e.g. once-a-year, or more frequently,
        or some inconsistent cycle). EventPilot uses instances to keep records
        separate (registrations, volunteers, etc).
      </Typography.Text>

      <Util.Hr text="Basic Info" />

      <Input
        label="Instance Name"
        placeholder={`Name of the instance (e.g. ${new Date().getFullYear()})`}
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
          minDate={new Date().toISOString().slice(0, 10)}
          minTime={new Date().toISOString().slice(11, 16)}
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
          minDate={new Date().toISOString().slice(0, 10)}
          minTime={new Date().toISOString().slice(11, 16)}
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
        onChange={(v) => setState({ ...state, registrationPeriodPricing: v })}
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
        Create Instance
      </Button>
    </div>
  );
};
