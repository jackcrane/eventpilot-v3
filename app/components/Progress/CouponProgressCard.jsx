import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const CouponProgressCard = ({ completed = false }) => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Create Coupons"
      icon="discount-2"
      color="var(--tblr-yellow-lt)"
      completed={completed}
      cta={
        <Button href={`/events/${eventId}/registration/coupons`} outline>
          Add a coupon
        </Button>
      }
    >
      <Typography.Text>
        Offer discounts on registration or upsells with coupon codes.
        Create codes for promotions, partners, or group deals.
      </Typography.Text>
    </ProgressCard>
  );
};

