import React, { useEffect, useMemo, useState } from "react";
import { Typography, Input, Util, Button, Alert } from "tabler-react-2";
import { TzDateTime } from "../tzDateTime/tzDateTime";
import { useInstance } from "../../hooks/useInstance";
import toast from "react-hot-toast";

export const InstanceEditor = ({ eventId, instanceId, close }) => {
  const {
    instance,
    loading,
    schema,
    schemaLoading,
    validationError,
    mutationLoading,
    updateInstance,
  } = useInstance({ eventId, instanceId });

  const [state, setState] = useState({
    name: null,
    startTime: null,
    startTimeTz: null,
    endTime: null,
    endTimeTz: null,
  });

  useEffect(() => {
    if (!instance) return;
    setState({
      name: instance?.name ?? null,
      startTime: instance?.startTime ?? null,
      startTimeTz: instance?.startTimeTz ?? null,
      endTime: instance?.endTime ?? null,
      endTimeTz: instance?.endTimeTz ?? null,
    });
  }, [instance]);

  const err = (k) => validationError?.[k]?._errors?.[0];

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (state.startTime && state.endTime && state.startTime > state.endTime) {
      toast.error("Start time must be before end time");
      return;
    }

    const success = await updateInstance(state);
    if (success && typeof close === "function") close();
  };

  if (loading || schemaLoading || !instance) return null;

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">INSTANCES</Typography.H5>
      <Typography.H1>Edit instance</Typography.H1>
      <Typography.Text>
        Update the basic details for this instance.
      </Typography.Text>

      <Util.Hr text="Basic Info" />

      <Input
        label="Instance Name"
        placeholder={`Name of the instance`}
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
        Save Changes
      </Button>
    </div>
  );
};
