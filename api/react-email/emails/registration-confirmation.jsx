// components/ImportFinishedEmail.jsx
import React from "react";
import { Email } from "../components/Email";
import { Heading, Link, Text } from "@react-email/components";

export const RegistrationConfirmationEmail = ({
  name,
  event,
  logoImage,
  bannerImage,
  receiptUrl,
}) => (
  <Email
    preview={`Thanks for registering for ${event.name}!`}
    logoImage={logoImage}
    headerImage={bannerImage}
  >
    <Heading style={{ fontWeight: 400, marginTop: 0 }}>
      Thanks for registering for {event.name}!
    </Heading>
    <Text>
      Hi, {name}! Thanks for registering for {event.name}!{" "}
      {receiptUrl && (
        <>
          Your receipt is <Link href={receiptUrl}>available here</Link>. If you
          have any questions, please feel free to reach out.
        </>
      )}
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
};

export default RegistrationConfirmationEmail;
