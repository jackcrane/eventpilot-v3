import { Button } from "tabler-react-2";
import { useRegistrationCoupon } from "../../hooks/useRegistrationCoupon";

export const CouponDeleteTrigger = ({ children, couponId, onDelete, eventId, ...props }) => {
  const { DeleteConfirmElement: ConfirmModal, deleteCoupon } = useRegistrationCoupon({
    eventId,
    couponId,
  });

  return (
    <>
      {ConfirmModal}
      <Button onClick={() => deleteCoupon(onDelete)} variant="danger" outline {...props}>
        {children}
      </Button>
    </>
  );
};

