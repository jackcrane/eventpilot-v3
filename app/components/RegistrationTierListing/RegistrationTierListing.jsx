import { EnclosedSelectGroup, Typography, Badge } from "tabler-react-2";
import { Loading } from "../loading/Loading";
import { useRegistrationConsumer } from "../../hooks/useRegistrationConsumer";

export const RegistrationTierListing = ({ eventId, value, setTier }) => {
  const { loading, tiers } = useRegistrationConsumer({ eventId });

  if (loading) return <Loading gradient={false} />;

  return (
    <div>
      <EnclosedSelectGroup
        value={{ value }}
        items={tiers.map((t) => ({
          label: (
            <>
              <Typography.H3 className="mb-0">{t.name}</Typography.H3>
              <Typography.Text className="mb-3">
                {t.description}
              </Typography.Text>
              {t.disabled ? (
                <>
                  <Typography.Text className="text-muted mb-0">
                    This tier is not available at this time.
                  </Typography.Text>
                </>
              ) : (
                <>
                  <Badge color="green-lt">
                    <span className="text-green" style={{ fontSize: "0.8rem" }}>
                      ${parseInt(t.period.price)?.toFixed(2)}
                    </span>
                  </Badge>
                </>
              )}
            </>
          ),
          value: t.id,
          id: t.id,
          disabled: t.disabled,
        }))}
        onChange={setTier}
        direction="column"
      />
    </div>
  );
};
