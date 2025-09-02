import { useParams } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboardData";
import { VolunteerRegistrationProgressCard } from "./VolunteerRegistrationProgressCard";
import { LocationProgressCard } from "./LocationProgressCard";
import { JobProgressCard } from "./JobProgressCard";
import { ShiftProgressCard } from "./ShiftProgressCard";
import { RegistrationFormProgressCard } from "./RegistrationFormProgressCard";
import { RegistrationUpsellsProgressCard } from "./RegistrationUpsellsProgressCard";
import { RegistrationPricingProgressCard } from "./RegistrationPricingProgressCard";
import { GmailProgressCard } from "./GmailProgressCard";
import { TeamProgressCard } from "./TeamProgressCard";
import { CouponProgressCard } from "./CouponProgressCard";

export const ProgressRow = () => {
  const { eventId } = useParams();
  const { loading, progress } = useDashboardData(eventId);
  const steps = progress?.steps;

  if (loading) return null;

  return (
    <>
      {[
        { key: "volunteerRegistrationForm", Comp: VolunteerRegistrationProgressCard },
        { key: "location", Comp: LocationProgressCard },
        { key: "job", Comp: JobProgressCard },
        { key: "shift", Comp: ShiftProgressCard },
        { key: "registrationForm", Comp: RegistrationFormProgressCard },
        { key: "tiersPeriods", Comp: RegistrationPricingProgressCard },
        { key: "upsells", Comp: RegistrationUpsellsProgressCard },
        { key: "coupons", Comp: CouponProgressCard },
        { key: "teams", Comp: TeamProgressCard },
        { key: "gmail", Comp: GmailProgressCard },
      ]
        .map(({ key, Comp }) => ({ key, Comp, done: !!steps?.[key] }))
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map(({ key, Comp, done }) => (
          <Comp key={key} completed={done} />
        ))}
    </>
  );
};
