import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useRegistrationCoupons } from "../../../../../hooks/useRegistrationCoupons";
import { Row } from "../../../../../util/Flex";
import { Table, Typography } from "tabler-react-2";
import { CouponCRUDTrigger } from "../../../../../components/CouponCRUD/CouponCRUDTrigger";
import { CouponDeleteTrigger } from "../../../../../components/CouponDeleteTrigger/CouponDeleteTrigger";

export const CouponsPage = () => {
  const { eventId } = useParams();
  const { coupons, loading } = useRegistrationCoupons({ eventId });

  return (
    <EventPage title="Coupons" loading={loading}>
      <CouponCRUDTrigger>Add Coupon</CouponCRUDTrigger>
      <div className="mt-3" />
      <div className="table-responsive">
        <Table
          className="card table-responsive"
          columns={[
            {
              label: "Edit",
              accessor: "id",
              render: (v, r) => (
                <Row gap={1} align="center">
                  <CouponCRUDTrigger size="sm" coupon={r}>
                    Edit
                  </CouponCRUDTrigger>
                  <CouponDeleteTrigger size="sm" couponId={r.id} eventId={eventId}>
                    Delete
                  </CouponDeleteTrigger>
                </Row>
              ),
            },
            { label: "Title", accessor: "title" },
            { label: "Code", accessor: "code" },
            {
              label: "Type",
              accessor: "discountType",
              render: (v, r) => (r.discountType === "FLAT" ? "Flat" : "Percent"),
            },
            {
              label: "Amount",
              accessor: "amount",
              render: (v, r) =>
                r.discountType === "FLAT" ? `$${Number(v).toFixed(2)}` : `${Number(v).toFixed(0)}%`,
            },
            {
              label: "Scope",
              accessor: "appliesTo",
              render: (v) =>
                v === "BOTH" ? "Registration + Upsells" : v === "REGISTRATION" ? "Registration" : "Upsells",
            },
            {
              label: "Redemptions",
              accessor: "redemptions",
              render: (v, r) =>
                r.maxRedemptions === -1
                  ? `${v || 0}`
                  : `${v || 0} / ${r.maxRedemptions}`,
            },
          ]}
          data={coupons}
        />
      </div>
    </EventPage>
  );
};
