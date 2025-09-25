import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Email } from "../components/Email";

const styles = {
  heading: {
    fontWeight: 400,
    marginTop: 0,
  },
  meta: {
    marginTop: "12px",
    marginBottom: 0,
  },
};

export const LoginEmail = ({ name, city, regionName, ip }) => (
  <Email preview="New login to EventPilot">
    <Heading as="h1" style={styles.heading}>
      New login to EventPilot
    </Heading>
    <Text>
      Hi, {name}! We are writing to inform you that someone has successfully
      logged into your account. If this was not you, please contact us
      immediately. If this was you, there is nothing to do.
    </Text>
    <Text style={styles.meta}>
      <b>IP Address: </b>
      {ip}
      <br />
      <b>Location: </b>
      {city}, {regionName}
    </Text>
  </Email>
);

LoginEmail.PreviewProps = {
  name: "Jack Crane",
  email: "jackgeteventpilot.com",
  ip: "127.0.0.1",
  regionName: "California",
  city: "San Francisco",
};

export default LoginEmail;
