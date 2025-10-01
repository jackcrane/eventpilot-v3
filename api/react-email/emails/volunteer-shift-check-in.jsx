import React from "react";
import { Heading, Text } from "@react-email/components";
import { Email } from "../components/Email";

const styles = {
  heading: {
    fontWeight: 600,
    marginTop: 0,
    marginBottom: 16,
  },
  sectionHeading: {
    fontWeight: 500,
    marginTop: 24,
    marginBottom: 8,
  },
  shiftList: {
    margin: 0,
    paddingLeft: 18,
  },
  listItem: {
    marginBottom: 8,
  },
};

export const VolunteerShiftCheckInEmail = ({
  event,
  volunteerName,
  shifts,
}) => {
  const name = volunteerName?.trim() ? volunteerName.trim() : "there";
  const eventName = event?.name || "our event";
  const plural = shifts?.length > 1;

  return (
    <Email preview={`Thanks for volunteering at ${eventName}`}>
      <Heading as="h1" style={styles.heading}>
        Thank you for volunteering today!
      </Heading>
      <Text>
        Hi {name}, thank you for checking in to volunteer with {eventName}. We
        appreciate your time and hope you have an enjoyable experience.
      </Text>

      <Heading as="h2" style={styles.sectionHeading}>
        Your shift{plural ? "s" : ""} today
      </Heading>
      <Text style={{ marginTop: 0 }}>
        Here's a quick reminder of where you'll be helping:
      </Text>
      <ul style={styles.shiftList}>
        {(shifts || []).map((shift, index) => (
          <li key={index} style={styles.listItem}>
            <Text style={{ margin: 0 }}>
              {shift.range}
              {shift.jobName ? ` — ${shift.jobName}` : ""}
              {shift.locationName ? ` @ ${shift.locationName}` : ""}
            </Text>
          </li>
        ))}
      </ul>

      <Text>
        If you need anything during your shift, please reach out to the
        {" "}
        {eventName} team. We're grateful to have you on board!
      </Text>
    </Email>
  );
};

VolunteerShiftCheckInEmail.PreviewProps = {
  event: { name: "Sample Event" },
  volunteerName: "Alex Volunteer",
  shifts: [
    {
      range: "Mar 12, 2025, 2:00 PM - 4:00 PM (America/New_York)",
      jobName: "Registration Desk",
      locationName: "Main Lobby",
    },
    {
      range: "Mar 12, 2025, 4:30 PM - 6:00 PM (America/New_York)",
      jobName: "Room Host",
      locationName: "Room 204",
    },
  ],
};

export default VolunteerShiftCheckInEmail;
