import { EnclosedSelectGroup } from "tabler-react-2";
import React, { useEffect, useState } from "react";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useParams } from "react-router-dom";

const humanize = (str) => {
  const dict = {
    emailVerified: "Email verified",
    goodPaymentStanding: "In good payment standing",
    volunteerRegistrationForm:
      "Started building the volunteer registration form",
    location: "Created a location",
    job: "Created a job",
    shift: "Created a shift",
  };

  return dict[str] || str;
};

export const TodoList = () => {
  const [value, setValue] = useState([]);
  const { eventId } = useParams();
  const { loading, progress } = useDashboardData(eventId);

  let items = progress?.steps
    ? Object.entries(progress.steps)
        .map(([key, val]) => ({
          value: key,
          label: humanize(key),
          checked: val,
        }))
        .sort((a, b) => a.checked - b.checked)
    : [];

  useEffect(() => {
    setValue(items.filter((i) => i.checked));
  }, [progress]);

  return (
    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
      <EnclosedSelectGroup
        items={items}
        value={value}
        // onChange={setValue}
        direction="column"
        multiple
      />
    </div>
  );
};
