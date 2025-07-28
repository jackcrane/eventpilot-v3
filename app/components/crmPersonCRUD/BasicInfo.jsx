import React from "react";
import { Input } from "tabler-react-2";
import { ArrayListing } from "../ArrayListing/arrayListing";

const switchSource = (source) => {
  switch (source) {
    case "MANUAL":
      return "Manually added from dashboard";
    case "IMPORT":
      return "Imported from CSV";
    case "VOLUNTEER":
      return "Registered as a volunteer";
    case "SENT_EMAIL":
      return "You sent this person an email";
    case "EMAIL":
      return "This person sent you an email";
    case "REGISTRATION":
      return "Registered for an event";
    default:
      return "Unknown";
  }
};

// Component: BasicInfo

export const BasicInfo = ({ localCrmPerson = {}, setLocalCrmPerson }) => (
  <>
    <Input
      label="Name"
      value={localCrmPerson.name}
      onChange={(e) => setLocalCrmPerson({ ...localCrmPerson, name: e })}
      required
    />
    <ArrayListing
      label="Emails"
      singularLabel="Email"
      value={localCrmPerson.emails}
      onChange={(emails) => setLocalCrmPerson({ ...localCrmPerson, emails })}
      icon="mail"
      valueField="email"
    />
    <ArrayListing
      label="Phone Numbers"
      singularLabel="Phone"
      value={localCrmPerson.phones}
      onChange={(phones) => setLocalCrmPerson({ ...localCrmPerson, phones })}
      icon="phone"
      valueField="phone"
    />
    <Input
      label="Aquisition Source"
      value={switchSource(localCrmPerson.source)}
      inputProps={{ disabled: true }}
    />
    {/* {JSON.stringify(localCrmPerson)} */}
  </>
);
