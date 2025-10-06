// components/ImportFinishedEmail.jsx
import React from "react";
import { Email } from "../components/Email";
import { Heading, Link, Text } from "@react-email/components";

export const RegistrationConfirmationEmail = ({
  name,
  event,
  logoImage,
  bannerImage,
  inviteLink,
  discountRate,
}) => (
  <Email
    preview={`Its almost ${event.name} time!`}
    logoImage={logoImage}
    headerImage={bannerImage}
  >
    <Heading style={{ fontWeight: 400, marginTop: 0 }}>
      T minus 6 weeks!
    </Heading>
    <Text>
      Hi, {name}! {event.name} is almost here! We know you are as excited as we
      are, and we can't wait to see you there!
    </Text>
    <Text>
      We know you are already participating, but everything is better with
      friends! If your friend registers using{" "}
      <Link href={inviteLink}>this link</Link>, they will get {discountRate}%
      off their registration, and you will get a free tee shirt!
    </Text>
  </Email>
);

RegistrationConfirmationEmail.PreviewProps = {
  name: "Jack Crane",
  logoImage:
    "https://jack-general.nyc3.digitaloceanspaces.com/eventpilot-v3/cmcp8bvbi0002gko25u7q0zw4cmc6bzahk0000uu8o006pdo6scma789it20000syo21hbkgxg8paddlefest.png",
  bannerImage:
    "https://jack-general.nyc3.digitaloceanspaces.com/eventpilot-v3/cmdhw6tx50000hh8o71ag93ee0688y0000000j0KAAQ%20%281%29.jpg",
  event: {
    name: "Ohio River Paddlefest",
  },
  receiptUrl:
    "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xTTFEeTFJWm0zS3p2N04wKLbnnsQGMgbqRJT4Jqk6LBYyhih3bUuDm1ckBCVm-XbtOLqyVYm9K_ZIkWgGbEGiTltBqprZWS5yTHt5",
  discountRate: 10,
  inviteLink: "https://geteventpilot.com/invite/123456789",
};

export default RegistrationConfirmationEmail;
