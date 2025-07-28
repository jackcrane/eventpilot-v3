import React from "react";
import { EnclosedSelectGroup, Typography, Badge } from "tabler-react-2";
import { useRegistrationUpsells } from "../../hooks/useRegistrationUpsells";

export const RegistrationUpsellListing = ({ eventId, value, setUpsell }) => {
  const { upsells, loading } = useRegistrationUpsells({ eventId });

  if (loading) {
    return <div>Loading...</div>;
  }

  const onSetUpsell = (upsell) => {
    setUpsell(upsell);
  };

  return (
    <>
      <EnclosedSelectGroup
        label="Upsells"
        value={value}
        onChange={onSetUpsell}
        items={upsells?.map((u) => ({
          value: u.id,
          label: (
            <>
              <Typography.H3 className="mb-0">{u.name}</Typography.H3>
              <Typography.Text className="mb-3">
                {u.description}
              </Typography.Text>
              {!u.available ? (
                <>
                  <Typography.Text className="text-muted mb-0">
                    This item is not available at this time.
                  </Typography.Text>
                </>
              ) : (
                <>
                  <Badge color="green-lt">
                    <span className="text-green" style={{ fontSize: "0.8rem" }}>
                      ${parseInt(u.price)?.toFixed(2)}
                    </span>
                  </Badge>
                </>
              )}
            </>
          ),
        }))}
        direction="column"
        multiple
      />
    </>
  );
};
