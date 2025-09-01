import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { CouponCRUD } from "./CouponCRUD";
import { Button } from "tabler-react-2";

export const CouponCRUDTrigger = ({ children, coupon, ...props }) => {
  const { OffcanvasElement, close, offcanvas } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <>
      {OffcanvasElement}
      <Button
        onClick={() =>
          offcanvas({ content: <CouponCRUD onClose={close} coupon={coupon} /> })
        }
        {...props}
      >
        {children}
      </Button>
    </>
  );
};

