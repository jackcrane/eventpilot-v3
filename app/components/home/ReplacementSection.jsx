import { Typography } from "tabler-react-2";
import { Col, Row, Responsive } from "../../util/Flex";
import {
  SiAirtable,
  SiAirtableHex,
  SiAsana,
  SiAsanaHex,
  SiGmail,
  SiGmailHex,
  SiGoogleforms,
  SiGoogleformsHex,
  SiMailchimp,
  SiMailchimpHex,
  SiSalesforce,
  SiSalesforceHex,
  SiSquarespace,
  SiSquarespaceHex,
  SiTicketmaster,
  SiTicketmasterHex,
} from "@icons-pack/react-simple-icons";
import styles from "./replacementsection.module.css";
import { Icon } from "../../util/Icon";

const LogoRow = ({ logo, name }) => {
  return (
    <Row gap={1} align="center">
      {logo}
      <Typography.Text className={"mb-0"}>{name}</Typography.Text>
    </Row>
  );
};

export const ReplacementSection = () => {
  return (
    <div>
      <Responsive
        gap={4}
        defaultDirection="row"
        rowAlign="center"
        colAlign="stretch"
      >
        <Col gap={2} align="flex-start" style={{ flex: 1 }}>
          <Typography.H3 className={styles.label}>
            Before EventPilot
          </Typography.H3>
          <LogoRow
            logo={<SiSalesforce color={SiSalesforceHex} />}
            name="Salesforce (CRM)"
          />
          <LogoRow
            logo={<SiMailchimp color={SiMailchimpHex} />}
            name="Mailchimp (Email Marketing)"
          />
          <LogoRow
            logo={<SiGmail color={SiGmailHex} />}
            name="Gmail (Email Conversations)"
          />
          <LogoRow
            logo={<SiSquarespace color={SiSquarespaceHex} />}
            name="Squarespace (Website Builder)"
          />
          <LogoRow
            logo={<SiGoogleforms color={SiGoogleformsHex} />}
            name="Google Forms (Surveys)"
          />
          <LogoRow
            logo={<SiAsana color={SiAsanaHex} />}
            name="Asana (Task Management)"
          />
          <LogoRow
            logo={<SiTicketmaster color={SiTicketmasterHex} />}
            name="Ticketmaster (Ticketing)"
          />
          <LogoRow
            logo={<SiAirtable color={SiAirtableHex} />}
            name="Airtable (Database)"
          />
        </Col>
        {/* Arrow between columns: right on desktop, down on mobile */}
        <Icon i={"arrow-right"} size={32} className={styles.onlyDesktop} />
        <Icon i={"arrow-down"} size={32} className={styles.onlyMobile} />
        <Col gap={2} align="flex-start" style={{ flex: 1 }}>
          <Typography.H3 className={styles.label}>
            With EventPilot
          </Typography.H3>
          <LogoRow
            logo={
              <img
                src="/assets/ico.png"
                alt="EventPilot Logo"
                style={{ width: 24 }}
              />
            }
            name="EventPilot (Everything)"
          />
        </Col>
      </Responsive>
    </div>
  );
};
