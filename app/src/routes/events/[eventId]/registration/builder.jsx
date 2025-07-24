import { Typography, Button, Input, Alert } from "tabler-react-2";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useEffect, useRef, useState } from "react";
import { Row } from "../../../../../util/Flex";
import { Icon } from "../../../../../util/Icon";
import { TzDateTime } from "../../../../../components/tzDateTime/tzDateTime";
import { useEvent } from "../../../../../hooks/useEvent";
import { useParams } from "react-router-dom";
import { useRegistrationBuilder } from "../../../../../hooks/useRegistrationBuilder";

export const TiersEditor = ({
  tiers,
  onAddTier,
  onRemoveTier,
  onChangeTierName,
  onChangeTierDesc,
  fieldErrors,
}) => (
  <>
    {tiers.map((tier) => (
      <div key={tier.id} className="mb-3">
        <Row gap={1} align="flex-end" className="mb-3">
          <div style={{ textAlign: "left", flex: 1 }}>
            <Input
              value={tier.name}
              invalid={Boolean(
                fieldErrors?.tiers?.[tiers.indexOf(tier)]?.name?._errors
              )}
              onChange={(name) => onChangeTierName(tier.id, name)}
              className="mb-0"
              label="Tier Name"
              placeholder="E.g. 5k, 10k, Youth, Senior"
              required
            />
          </div>
          <Button
            variant="danger"
            outline
            onClick={() => onRemoveTier(tier.id)}
          >
            <Icon i="trash" />
          </Button>
        </Row>
        <Input
          value={tier.description}
          onChange={(desc) => onChangeTierDesc(tier.id, desc)}
          useTextarea={true}
          placeholder={`Description for ${tier.name}`}
        />
      </div>
    ))}
    {tiers.length === 0 && (
      <Typography.Text>
        You haven't configured any registration tiers yet. You can do this by
        clicking the "Add Tier" button below.
      </Typography.Text>
    )}
    <Button onClick={onAddTier}>Add Tier</Button>
  </>
);

export const RegistrationBuilder = () => {
  const [tiers, setTiers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const { eventId } = useParams();
  const { event } = useEvent({ eventId });
  const {
    saveRegistration,
    validateOnly,
    tiers: _tiers,
    periods: _periods,
    loading,
  } = useRegistrationBuilder({ eventId });
  const [fieldErrors, setFieldErrors] = useState({});
  const [shouldReRunValidation, setShouldReRunValidation] = useState(false);

  const handleSave = async () => {
    validateOnly({ tiers, periods });
    const result = await saveRegistration({ tiers, periods });
    if (!result.success && result.errors) {
      setFieldErrors(result.errors);
      setShouldReRunValidation(true);
    } else {
      setFieldErrors({});
      setShouldReRunValidation(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    console.log(_tiers);
    setTiers(_tiers);
    setPeriods(_periods);
  }, [_tiers, _periods]);

  const addTier = () => {
    const newId = tiers.length ? Math.max(...tiers.map((t) => t.id)) + 1 : 0;
    setTiers((prev) => [...prev, { id: newId, name: "" }]);
    setPeriods((prev) =>
      prev.map((p) => ({
        ...p,
        prices: [...p.prices, { tierId: newId, price: "", isAvailable: true }],
      }))
    );
  };

  const removeTier = (id) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    setPeriods((prev) =>
      prev.map((p) => ({
        ...p,
        prices: p.prices.filter((pp) => pp.tierId !== id),
      }))
    );
  };

  const changeTierName = (id, name) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  const changeTierDesc = (id, desc) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, description: desc } : t))
    );
  };

  const nextLocalId = useRef(0);

  const addPeriod = () => {
    const newId = nextLocalId.current++;

    const newPrices = tiers.map(({ id }) => ({
      tierId: id,
      price: "",
      isAvailable: true,
    }));

    // Find the latest end time among existing periods
    const latestEnd = periods.length
      ? periods.reduce((latest, p) => {
          if (!p.endTime) return latest;
          return !latest || new Date(p.endTime) > new Date(latest)
            ? p.endTime
            : latest;
        }, null)
      : null;

    setPeriods((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        startTime: latestEnd,
        endTime: null,
        startTimeTz: event.defaultTz,
        endTimeTz: event.defaultTz,
        prices: newPrices,
      },
    ]);
  };

  const removePeriod = (id) => {
    setPeriods((prev) => prev.filter((p) => p.id !== id));
  };

  const rerunValidation = () => {
    if (shouldReRunValidation) {
      console.log("Rerunning validation");
      const valid = validateOnly({ tiers, periods });
      console.log(valid);
      if (valid.success) {
        setFieldErrors({});
      } else {
        setFieldErrors(valid.errors);
      }
    }
  };

  const updatePeriodField = (periodId, field, value) => {
    setPeriods((prev) =>
      prev.map((p) => (p.id === periodId ? { ...p, [field]: value } : p))
    );
    rerunValidation();
  };

  const updatePeriodPrice = (periodId, tierId, field, value) => {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== periodId) return p;
        return {
          ...p,
          prices: p.prices.map((pp) =>
            pp.tierId === tierId ? { ...pp, [field]: value } : pp
          ),
        };
      })
    );
    rerunValidation();
  };

  return (
    <EventPage title="Registration Builder">
      <Typography.H2>Step 1: Configure registration tiers</Typography.H2>
      <Typography.Text>
        First, you need to configure the registration tiers for your event.
        These are different pricing and service tiers you want to offer to your
        participants. For example, for a marathon, you might offer a "5k",
        "10k", "Half", "Full", "Youth", and "Senior" tier.
      </Typography.Text>
      <TiersEditor
        tiers={tiers}
        onAddTier={addTier}
        onRemoveTier={removeTier}
        onChangeTierName={changeTierName}
        onChangeTierDesc={changeTierDesc}
        fieldErrors={fieldErrors}
      />
      <div className="mb-3" />
      <Typography.H2>Step 2: Set up scheduled pricing</Typography.H2>
      <Typography.Text>
        Next, you need to set up the scheduled pricing for your event. This is
        the price you will charge your participants for each registration tier.
        This allows you to set up scheduled pricing, so you can have different
        prices as you get closer to the event. These could be like "Early bird"
        or "last minute" pricing.
      </Typography.Text>

      {periods.length > 0 && tiers.length > 0 && (
        <div className="table-responsive mb-3">
          <table className="table table-bordered table-responsive">
            <thead>
              <tr>
                <th>Period</th>
                {tiers.map((tier) => (
                  <th key={tier.id} style={{ minWidth: 200 }}>
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Row gap={1} align="flex-end" className="mb-3">
                      <Input
                        value={row.name}
                        invalid={Boolean(
                          fieldErrors?.periods?.[periods.indexOf(row)]?.name
                            ?._errors
                        )}
                        label="Period Name"
                        placeholder="E.g. Early Bird, Last Minute, Regular, etc."
                        required
                        style={{ flex: 1 }}
                        className="mb-0"
                        onChange={(name) =>
                          updatePeriodField(row.id, "name", name)
                        }
                      />
                      <Button
                        variant="danger"
                        outline
                        onClick={() => removePeriod(row.id)}
                      >
                        <Icon i="trash" />
                      </Button>
                    </Row>
                    <TzDateTime
                      value={row.startTime}
                      label="Start Date"
                      required
                      tz={row.startTimeTz}
                      onChange={([dt, tz]) => {
                        updatePeriodField(row.id, "startTime", dt);
                        updatePeriodField(row.id, "startTimeTz", tz);
                      }}
                      defaultTime="00:00"
                      dateTimeValid={
                        !fieldErrors?.periods?.[periods.indexOf(row)]?.startTime
                          ?._errors?.length
                      }
                      tzValid={
                        !fieldErrors?.periods?.[periods.indexOf(row)]
                          ?.startTimeTz?._errors?.length
                      }
                    />
                    <TzDateTime
                      value={row.endTime}
                      label="End Date"
                      required
                      tz={row.endTimeTz}
                      minDate={
                        row.startTime
                          ? new Date(row.startTime).toISOString().slice(0, 10)
                          : ""
                      }
                      minTime={
                        row.startTime
                          ? new Date(row.startTime).toISOString().slice(11, 16)
                          : ""
                      }
                      onChange={([dt, tz]) => {
                        updatePeriodField(row.id, "endTime", dt);
                        updatePeriodField(row.id, "endTimeTz", tz);
                      }}
                      defaultTime="00:00"
                      dateTimeValid={
                        !fieldErrors?.periods?.[periods.indexOf(row)]?.endTime
                          ?._errors?.length
                      }
                      tzValid={
                        !fieldErrors?.periods?.[periods.indexOf(row)]?.endTimeTz
                          ?._errors?.length
                      }
                    />
                  </td>
                  {tiers.map((tier) => {
                    const entry =
                      row.prices.find((pp) => pp.tierId === tier.id) || {};
                    return (
                      <td
                        key={tier.id}
                        style={{
                          backgroundColor: "var(--tblr-bg-surface)!important",
                        }}
                      >
                        <Input
                          value={entry.price}
                          invalid={Boolean(
                            fieldErrors?.periods?.[periods.indexOf(row)]
                              ?.prices?.[tiers.indexOf(tier)]?.price?._errors
                          )}
                          label="Price"
                          type="number"
                          required
                          onChange={(v) =>
                            updatePeriodPrice(row.id, tier.id, "price", v)
                          }
                          prependedText="$"
                          appendedText={"USD"}
                          inputProps={{
                            min: 0,
                            disabled: !entry.isAvailable,
                          }}
                          style={{
                            opacity: entry.isAvailable ? 1 : 0.5,
                          }}
                        />
                        <label
                          className="form-check"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={entry.isAvailable}
                            onChange={(e) =>
                              updatePeriodPrice(
                                row.id,
                                tier.id,
                                "isAvailable",
                                e.target.checked
                              )
                            }
                          />
                          <span
                            className="form-check-label"
                            style={{ textAlign: "left" }}
                          >
                            Registration available at this period
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td colSpan={tiers.length + 1}>
                  <Button onClick={addPeriod}>Add Price Period</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {periods.length === 0 && tiers.length > 0 && (
        <Button onClick={addPeriod}>Add Price Period</Button>
      )}
      {tiers.length === 0 && (
        <Alert variant="warning" title="No Registration Tiers">
          Set up at least one registration tier before adding price periods.
        </Alert>
      )}
      {Object.keys(fieldErrors)?.length > 0 && (
        <Alert variant="danger" title="Errors">
          You have some errors in the form above. Please fix them and try again.
        </Alert>
      )}
      <Button onClick={handleSave}>Save</Button>
    </EventPage>
  );
};
