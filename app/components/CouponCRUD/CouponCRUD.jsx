import {
  Typography,
  Input,
  DropdownInput,
  Button,
  Checkbox,
} from "tabler-react-2";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loading } from "../loading/Loading";
import { useRegistrationCoupons } from "../../hooks/useRegistrationCoupons";
import { useRegistrationCoupon } from "../../hooks/useRegistrationCoupon";
import { TzDateTime } from "../tzDateTime/tzDateTime";
import { useEvent } from "../../hooks/useEvent";
import { Row } from "../../util/Flex";

export const CouponCRUD = ({ coupon, onClose, ...props }) => {
  if (coupon?.id) {
    return <CouponEdit couponId={coupon.id} onClose={onClose} {...props} />;
  }
  return <CouponCreate onClose={onClose} {...props} />;
};

const CouponCreate = ({ onClose }) => {
  const { eventId } = useParams();
  const { mutationLoading, createCoupon, validationError, schema } =
    useRegistrationCoupons({ eventId });

  return (
    <_CouponCRUD
      value={null}
      onClose={onClose}
      mutationLoading={mutationLoading}
      validationError={validationError}
      onFinish={(payload) => createCoupon(payload)}
      schema={schema}
    />
  );
};

const CouponEdit = ({ couponId, onClose }) => {
  const { eventId } = useParams();
  const {
    coupon,
    loading,
    mutationLoading,
    validationError,
    updateCoupon,
    schema,
  } = useRegistrationCoupon({ eventId, couponId });

  if (loading) return <Loading />;

  return (
    <_CouponCRUD
      value={coupon}
      onClose={onClose}
      mutationLoading={mutationLoading}
      validationError={validationError}
      onFinish={updateCoupon}
      schema={schema}
    />
  );
};

const _CouponCRUD = ({
  value,
  onClose,
  mutationLoading,
  validationError,
  onFinish,
  schema,
}) => {
  const [coupon, setCoupon] = useState(
    value || {
      discountType: "FLAT",
      appliesTo: "BOTH",
      maxRedemptions: -1,
      endsAt: null,
      endsAtTz: null,
    }
  );
  const { eventId } = useParams();
  const { event } = useEvent({ eventId });
  const [unlimited, setUnlimited] = useState(
    (value?.maxRedemptions ?? -1) === -1
  );
  const defaultTz = event?.defaultTz || "UTC";

  useEffect(() => {
    setCoupon(
      value || {
        discountType: "FLAT",
        appliesTo: "BOTH",
        maxRedemptions: -1,
        endsAt: null,
        endsAtTz: defaultTz,
      }
    );
    setUnlimited((value?.maxRedemptions ?? -1) === -1);
  }, [value]);

  const handleSubmit = async () => {
    // Convert local datetime values to ISO if present
    const payload = {
      title: coupon.title,
      code: coupon.code,
      discountType: coupon.discountType,
      amount: Number(coupon.amount),
      appliesTo: coupon.appliesTo,
      maxRedemptions: unlimited ? -1 : Number(coupon.maxRedemptions ?? 1),
      endsAt: coupon.endsAt ? new Date(coupon.endsAt).toISOString() : null,
      endsAtTz: coupon.endsAt ? coupon.endsAtTz || defaultTz : null,
    };

    if (await onFinish(payload)) onClose?.();
  };

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">COUPON</Typography.H5>
      <Typography.H1>{value?.title || "New Coupon"}</Typography.H1>

      <Input
        label="Title"
        value={coupon.title}
        onChange={(e) => setCoupon({ ...coupon, title: e })}
        required
        placeholder="Coupon title (internal)"
        invalid={validationError?.title?._errors?.length > 0}
        invalidText={validationError?.title?._errors?.[0]}
      />

      <Input
        label="Code"
        value={coupon.code}
        onChange={(e) => setCoupon({ ...coupon, code: e })}
        placeholder="Optional — auto-generated if blank"
        invalid={validationError?.code?._errors?.length > 0}
        invalidText={validationError?.code?._errors?.[0]}
      />

      <Row gap={1} align="center">
        <DropdownInput
          label="Discount Type"
          items={[
            { id: "FLAT", value: "FLAT", label: "Flat Amount ($ off)" },
            { id: "PERCENT", value: "PERCENT", label: "Percent (% off)" },
          ]}
          value={coupon.discountType}
          onChange={(i) => setCoupon({ ...coupon, discountType: i.value })}
          className={"mb-2"}
          required
        />

        <Input
          label={coupon.discountType === "FLAT" ? "Amount ($)" : "Percent (%)"}
          type="number"
          value={coupon.amount}
          onChange={(e) => setCoupon({ ...coupon, amount: e })}
          prependedText={coupon.discountType === "FLAT" ? "$" : undefined}
          appendedText={coupon.discountType === "PERCENT" ? "%" : undefined}
          invalid={validationError?.amount?._errors?.length > 0}
          invalidText={validationError?.amount?._errors?.[0]}
          style={{ flex: 1 }}
          required
        />
      </Row>

      <DropdownInput
        label="Applies To"
        items={[
          { id: "BOTH", value: "BOTH", label: "Registration + Upsells" },
          {
            id: "REGISTRATION",
            value: "REGISTRATION",
            label: "Registration only",
          },
          { id: "UPSELLS", value: "UPSELLS", label: "Upsells only" },
        ]}
        value={coupon.appliesTo}
        onChange={(i) => setCoupon({ ...coupon, appliesTo: i.value })}
        className="mb-2"
        required
      />

      <Checkbox
        label="Unlimited redemptions"
        value={unlimited}
        onChange={(e) => {
          setUnlimited(e);
          setCoupon({ ...coupon, maxRedemptions: e ? -1 : 1 });
        }}
        className="mb-2"
      />
      {!unlimited && (
        <Input
          label="Max Redemptions"
          type="number"
          value={coupon.maxRedemptions ?? 1}
          onChange={(e) => setCoupon({ ...coupon, maxRedemptions: Number(e) })}
          inputProps={{ min: 1 }}
          required
          invalid={validationError?.maxRedemptions?._errors?.length > 0}
          invalidText={validationError?.maxRedemptions?._errors?.[0]}
          className="mb-3"
        />
      )}

      <TzDateTime
        label="Ends At"
        value={coupon.endsAt}
        tz={coupon.endsAtTz || defaultTz}
        onChange={([iso, tz]) =>
          setCoupon({ ...coupon, endsAt: iso, endsAtTz: tz })
        }
        afterLabel={
          <Button
            size="sm"
            onClick={() =>
              setCoupon({ ...coupon, endsAt: null, endsAtTz: null })
            }
          >
            Clear Selection
          </Button>
        }
      />

      <Button
        onClick={handleSubmit}
        loading={mutationLoading}
        variant="primary"
      >
        {coupon.id ? "Update" : "Create"} Coupon
      </Button>
    </div>
  );
};
