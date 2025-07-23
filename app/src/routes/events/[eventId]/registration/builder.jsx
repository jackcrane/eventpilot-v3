import { Typography, Button, Input, Card } from "tabler-react-2";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useState } from "react";
import { Row } from "../../../../../util/Flex";
import { Icon } from "../../../../../util/Icon";
import { TzDateTime } from "../../../../../components/tzDateTime/tzDateTime";
import { useEvent } from "../../../../../hooks/useEvent";
import { useParams } from "react-router-dom";

export const TiersEditor = ({
  tiers,
  onAddTier,
  onRemoveTier,
  onChangeTierName,
}) => (
  <>
    {tiers.map((tier) => (
      <div key={tier.id} className="mb-3">
        <Row gap={1} align="flex-end" className="mb-3">
          <div style={{ textAlign: "left", flex: 1 }}>
            <Input
              value={tier.name}
              onChange={(name) => onChangeTierName(tier.id, name)}
              className="mb-0"
              label="Tier Name"
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

  const addPeriod = () => {
    const newId = periods.length
      ? Math.max(...periods.map((p) => p.id)) + 1
      : 0;

    const newPrices = tiers.map(({ id }) => ({
      tierId: id,
      price: "",
      isAvailable: true,
    }));

    // Find the latest end time among existing periods
    const latestEnd = periods.length
      ? periods.reduce((latest, p) => {
          if (!p.end) return latest;
          return !latest || new Date(p.end) > new Date(latest) ? p.end : latest;
        }, null)
      : null;

    setPeriods((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        start: latestEnd,
        end: null,
        startTz: event.defaultTz,
        endTz: event.defaultTz,
        prices: newPrices,
      },
    ]);
  };

  const removePeriod = (id) => {
    setPeriods((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePeriodField = (periodId, field, value) => {
    setPeriods((prev) =>
      prev.map((p) => (p.id === periodId ? { ...p, [field]: value } : p))
    );
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
                  <th key={tier.id}>{tier.name}</th>
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
                        label="Period Name"
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
                      value={row.start}
                      label="Start Date"
                      required
                      tz={row.startTz}
                      onChange={([dt, tz]) => {
                        updatePeriodField(row.id, "start", dt);
                        updatePeriodField(row.id, "startTz", tz);
                      }}
                    />
                    <TzDateTime
                      value={row.end}
                      label="End Date"
                      required
                      tz={row.endTz}
                      minDate={
                        row.start
                          ? new Date(row.start).toISOString().slice(0, 10)
                          : ""
                      }
                      minTime={
                        row.start
                          ? new Date(row.start).toISOString().slice(11, 16)
                          : ""
                      }
                      onChange={([dt, tz]) => {
                        updatePeriodField(row.id, "end", dt);
                        updatePeriodField(row.id, "endTz", tz);
                      }}
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
    </EventPage>
  );
};
