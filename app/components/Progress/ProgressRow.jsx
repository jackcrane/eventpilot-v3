import { useParams } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboardData";
import { Button, Typography } from "tabler-react-2";
import { useEvent } from "../../hooks/useEvent";
import { ProgressCard } from "./ProgressCard";
import { VolunteerRegistrationProgressCard } from "./VolunteerRegistrationProgressCard";
import { LocationProgressCard } from "./LocationProgressCard";
import { JobProgressCard } from "./JobProgressCard";
import { ShiftProgressCard } from "./ShiftProgressCard";
import { RegistrationFormProgressCard } from "./RegistrationFormProgressCard";
import { RegistrationUpsellsProgressCard } from "./RegistrationUpsellsProgressCard";
import { RegistrationPricingProgressCard } from "./RegistrationPricingProgressCard";
import { GmailProgressCard } from "./GmailProgressCard";

export const ProgressRow = () => {
  const { eventId } = useParams();
  const { loading, progress } = useDashboardData(eventId);
  const steps = progress?.steps;

  if (loading) return null;

  return (
    <>
      {!steps.volunteerRegistrationForm && (
        <VolunteerRegistrationProgressCard />
      )}
      {!steps.location && <LocationProgressCard />}
      {!steps.job && <JobProgressCard />}
      {!steps.shift && <ShiftProgressCard />}
      {!steps.registrationForm && <RegistrationFormProgressCard />}
      {!steps.tiersPeriods && <RegistrationPricingProgressCard />}
      {!steps.upsells && <RegistrationUpsellsProgressCard />}
      {!steps.gmail && <GmailProgressCard />}
    </>
  );
};
