// components/ImportFinishedEmail.jsx
import React from "react";
import { Email } from "../components/Email";
import { Heading, Text } from "@react-email/components";

export const ImportFinishedEmail = ({ name }) => (
  <Email preview="An import has finished">
    <Heading style={{ fontWeight: 400, marginTop: 0 }}>
      An import has finished
    </Heading>
    <Text>
      Hi, {name}! We are writing to inform you that the import effort you
      initiated has completed, and your contacts have been imported to the
      EventPilot CRM.
    </Text>
  </Email>
);

ImportFinishedEmail.PreviewProps = {
  name: "Jack Crane",
  email: "jackgeteventpilot.com",
  ip: "127.0.0.1",
  regionName: "California",
  city: "San Francisco",
};

export default ImportFinishedEmail;
