import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";
import moment from "moment-timezone";
import data from "../tzs.json";

const baseUrl = "";

const utc = (value) => {
  const tz = data.find((t) => t?.value?.toLowerCase() === value?.toLowerCase());
  // return tz;
  const vtr = tz?.utc?.[0];
  return vtr;
};

/** @type {{ main: import("react").CSSProperties }} */
const styles = {
  main: {
    backgroundColor: "#f7f7f7",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    border: "1px solid #eee",
    backgroundColor: "#ffffff",
  },
  content: {
    padding: "20px",
  },
  heading: {
    fontWeight: 400,
  },
  button: {
    backgroundColor: "#0072ce",
    color: "#ffffff",
    borderRadius: "5px",
    padding: "8px 16px",
    textDecoration: "none",
    border: "none",
    display: "inline-block",
  },
  or: {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    display: "inline-block",
  },
};

export const VolunteerFormResponseThankYouEmail = ({ data, event }) => (
  <Html>
    <Head>
      <Font
        fontFamily="Inter"
        fallbackFontFamily="system-ui"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp504jAa1ZL7W0Q5nw.woff2",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Font
        fontFamily="Inter"
        fallbackFontFamily="system-ui"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50PDca1ZL7W0Q5nw.woff2",
          format: "woff2",
        }}
        fontWeight={600}
        fontStyle="semibold"
      />
    </Head>
    <Preview>
      Thank you for volunteering! Here is a summary of your responses and the
      shifts you registered for.
    </Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img
          src={"https://geteventpilot.com/static/email-header.png"}
          width="100%"
        />
        <div style={styles.content}>
          <Heading mt={0} as={"h1"} style={styles.heading}>
            Thank you for volunteering!
          </Heading>
          <Text>
            Hi, {data.response.flat.name}! Thank you for volunteering for{" "}
            {event.name}! Volunteers are critical to the success of every event,
            and we are excited to have you on board.
          </Text>

          <Heading mt={0} as={"h2"} style={styles.heading}>
            Your shifts
          </Heading>

          <Text>
            We are excited to welcome you for your shifts. Here is what you
            signed up for:
          </Text>

          {data.groupedShifts.map((location) => (
            <div key={location.id}>
              <Heading
                mt={16}
                as={"h3"}
                style={{ ...styles.heading, marginBottom: 0 }}
              >
                {location.name}
              </Heading>
              <Text style={{ marginTop: 0 }}>
                {[location.address, location.city, location.state]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
              {location.jobs.map((job) => (
                <div key={job.id} style={{ paddingLeft: 16 }}>
                  <Heading
                    mt={0}
                    as={"h4"}
                    style={{ ...styles.heading, marginBottom: 0 }}
                  >
                    {job.name}
                  </Heading>
                  <div style={{ marginTop: 0 }}>
                    <ul>
                      {job.shifts.map((shift) => (
                        <li key={shift.id}>
                          <Text style={{ margin: 0 }}>
                            {moment(shift.startTime)
                              .tz(utc(shift.startTimeTz))
                              .format("h:mm a")}
                            {" - "}
                            {moment(shift.endTime)
                              .tz(utc(shift.endTimeTz))
                              .format("h:mm a")}{" "}
                            ({shift.startTimeTz})
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <Text>
            We look forward to seeing you at {event.name}! If you have any
            question about your involvement wiht {event.name}, please reach out
            to your event team. If you have any technical questions, please
            reach out to support@geteventpilot.com.
          </Text>

          <Text style={styles.or}>
            We value your privacy and security. Please do not reply to this
            email. If you need, you can{" "}
            <Link href="mailto:support@geteventpilot.com">contact us here</Link>
            .
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
);

VolunteerFormResponseThankYouEmail.PreviewProps = {
  data: {
    response: {
      cmc6cpim900008ojs9mujvdhn: "Jack Crane",
      cmc6cpiwo00018ojs3mfyfj28: "jackgeteventpilot.com",
      cmc6qgxnr0000o2x9l458mt9s: "5136289360",
      cmc6cpj1w00028ojscrbbdvd4: {
        id: "cmc6gnypg0017o27p0b3qo88j",
        label: "L",
      },
      cmc6gnecb000qo27pvwm6ftty: {
        id: "cmc6gnypg001do27pfqpxrqjw",
        label: "Google",
      },
      cmc8bl5w70000o27e0njin7k9: null,
      createdAt: "2025-07-02T20:31:53.286Z",
      updatedAt: "2025-07-02T20:31:53.286Z",
      id: "cmcmex3uv0000o2obdc3o4qfj",
      flat: { email: "jackgeteventpilot.com", name: "Jack Crane" },
    },
    fields: [
      {
        id: "cmc6cpim900008ojs9mujvdhn",
        label: "Your Name",
        type: "text",
        options: [],
        deleted: false,
        order: 0,
        required: true,
        currentlyInForm: true,
      },
      {
        id: "cmc6cpiwo00018ojs3mfyfj28",
        label: "Your Email",
        type: "email",
        options: [],
        deleted: false,
        order: 1,
        required: true,
        currentlyInForm: true,
      },
      {
        id: "cmc6qgxnr0000o2x9l458mt9s",
        label: "Your Phone Number",
        type: "phone",
        options: [],
        deleted: false,
        order: 2,
        required: false,
        currentlyInForm: true,
      },
      {
        id: "cmc6cpj1w00028ojscrbbdvd4",
        label: "T-Shirt Size",
        type: "dropdown",
        options: [
          { id: "cmc6gnecb000eo27p0oq3u9lc", label: "XS", deleted: true },
          { id: "cmc6gnecb000fo27pf6afludg", label: "XS", deleted: true },
          { id: "cmc6gnecb000go27pxkyobeqy", label: "S", deleted: true },
          { id: "cmc6gnecb000ho27pw6h6zwgk", label: "S", deleted: true },
          { id: "cmc6gnecb000io27pv50r1ii3", label: "M", deleted: true },
          { id: "cmc6gnecb000jo27psp7q6c03", label: "M", deleted: true },
          { id: "cmc6gnecb000ko27phrmbbp0c", label: "L", deleted: true },
          { id: "cmc6gnecb000lo27ptqk46cyk", label: "L", deleted: true },
          { id: "cmc6gnecb000mo27pq1p7ybeh", label: "XL", deleted: true },
          { id: "cmc6gnecb000no27pwnz8t7no", label: "XL", deleted: true },
          { id: "cmc6gnecb000oo27p5fpf2s2e", label: "XXL", deleted: true },
          { id: "cmc6gnecb000po27p0uudg0dv", label: "XXL", deleted: true },
          { id: "cmc6cpj7100038ojstuhscj73", label: "XS", deleted: true },
          { id: "cmc6cpjet00048ojsot17xss9", label: "S", deleted: true },
          { id: "cmc6cpjio00058ojshy508nqn", label: "M", deleted: true },
          { id: "cmc6cpjmg00068ojsd0gf1eu1", label: "L", deleted: true },
          { id: "cmc6cpjqe00078ojsmxbzhl5t", label: "XL", deleted: true },
          { id: "cmc6cpjub00088ojsjjlpv4cv", label: "XXL", deleted: true },
          { id: "cmc6gjyv40001o2bivpzvinu8", label: "XS", deleted: true },
          { id: "cmc6gjyv40002o2bikr5bscn6", label: "S", deleted: true },
          { id: "cmc6gjyv40003o2bicvp1ga01", label: "M", deleted: true },
          { id: "cmc6gjyv40004o2bil9sqgwzg", label: "L", deleted: true },
          { id: "cmc6gjyv40005o2bir8yvvwmc", label: "XL", deleted: true },
          { id: "cmc6gjyv40006o2bis6kk2la4", label: "XXL", deleted: true },
          { id: "cmc6gn4km0000o27pk6z5jt1k", label: "XS", deleted: true },
          { id: "cmc6gn4km0001o27pz6v7g1ie", label: "XS", deleted: true },
          { id: "cmc6gn4km0002o27pzz37tfcv", label: "S", deleted: true },
          { id: "cmc6gn4km0003o27ppfcrw9jf", label: "S", deleted: true },
          { id: "cmc6gn4km0004o27pbpdtf3qw", label: "M", deleted: true },
          { id: "cmc6gn4km0005o27pvnigtw5d", label: "M", deleted: true },
          { id: "cmc6gn4km0006o27pcw3arwvo", label: "L", deleted: true },
          { id: "cmc6gn4km0007o27pz3oau7kq", label: "L", deleted: true },
          { id: "cmc6gn4km0008o27pkozdymp6", label: "XL", deleted: true },
          { id: "cmc6gn4km0009o27p3bpsuw2o", label: "XL", deleted: true },
          { id: "cmc6gn4km000ao27piayxnvbh", label: "XXL", deleted: true },
          { id: "cmc6gn4km000bo27pteskuypt", label: "XXL", deleted: true },
          { id: "cmc6gnypg0010o27p9w2wmao1", label: "XS", deleted: false },
          { id: "cmc6gnypg0011o27pqchyc8j9", label: "XS", deleted: true },
          { id: "cmc6gnypg0012o27pbb6ra2sh", label: "S", deleted: true },
          { id: "cmc6gnypg0015o27phm6z6s7s", label: "M", deleted: true },
          { id: "cmc6gnypg0016o27pnkyufu2n", label: "L", deleted: true },
          { id: "cmc6gnypg0019o27p50fxvrsn", label: "XL", deleted: true },
          { id: "cmc6gnypg001ao27pf6ejtoeu", label: "XXL", deleted: true },
          { id: "cmc6gnypg0013o27pio5t65ba", label: "S", deleted: false },
          { id: "cmc6gnypg0014o27p6dyimny0", label: "M", deleted: false },
          { id: "cmc6gnypg0017o27p0b3qo88j", label: "L", deleted: false },
          { id: "cmc6gnypg0018o27pl8arwveu", label: "XL", deleted: false },
          { id: "cmc6gnypg001bo27pzakcumva", label: "XXL", deleted: false },
        ],
        deleted: false,
        order: 3,
        required: true,
        currentlyInForm: true,
      },
      {
        id: "cmc6gnecb000qo27pvwm6ftty",
        label: "How did you hear about Paddlefest?",
        type: "dropdown",
        options: [
          {
            id: "cmc6gnecb000ro27pptqqo005",
            label: "Word-of-mouth",
            deleted: true,
          },
          { id: "cmc6gnecb000so27ph936c3vr", label: "Google", deleted: true },
          { id: "cmc6gnecb000to27p3jsbpekg", label: "Facebook", deleted: true },
          { id: "cmc6gnecb000uo27pz1zzkzkv", label: "Twitter", deleted: true },
          {
            id: "cmc6gnecb000vo27p8js2tmh4",
            label: "Instagram",
            deleted: true,
          },
          {
            id: "cmc6gnecb000wo27pw4i6uaid",
            label: "Advertisement",
            deleted: true,
          },
          { id: "cmc6gnecb000xo27pufzk9w2c", label: "Other", deleted: true },
          {
            id: "cmc6gnypg001co27pzptiz24s",
            label: "Word-of-mouth",
            deleted: false,
          },
          { id: "cmc6gnypg001do27pfqpxrqjw", label: "Google", deleted: false },
          {
            id: "cmc6gnypg001eo27pwm5lrbxc",
            label: "Facebook",
            deleted: false,
          },
          { id: "cmc6gnypg001fo27pox8lctvy", label: "Twitter", deleted: false },
          {
            id: "cmc6gnypg001go27pr452hhxq",
            label: "Instagram",
            deleted: false,
          },
          { id: "cmc6gnypg001io27pc6ouxidk", label: "Other", deleted: false },
          {
            id: "cmc6gnypg001ho27pt0f4s40f",
            label: "Advertisements",
            deleted: false,
          },
        ],
        deleted: false,
        order: 4,
        required: false,
        currentlyInForm: true,
      },
      {
        id: "cmc8bl5w70000o27e0njin7k9",
        label: "What is your address?",
        type: "shortAnswer",
        options: [],
        deleted: false,
        order: 5,
        required: false,
        currentlyInForm: true,
      },
    ],
    pii: {
      id: "cmcmex3uw0006o2obf0cu7art",
      formResponseId: "cmcmex3uv0000o2obdc3o4qfj",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      ipAddress: "::1",
      fingerprint: "3d3f24ec97867ffdfbf4466cb775f3fb",
      location: {
        IPv4: "72.49.253.22",
        city: "Cincinnati",
        state: "Ohio",
        postal: "45230",
        latitude: 39.0713,
        longitude: -84.3758,
        country_code: "US",
        country_name: "United States",
      },
      tz: "America/New_York",
      browser: { name: "Arc", major: "137", version: "137.0.0.0" },
      device: { model: "Macintosh", vendor: "Apple" },
      os: { name: "macOS", version: "10.15.7" },
      screenWidth: 792,
      screenHeight: 798,
      createdAt: "2025-07-02T20:31:53.286Z",
      updatedAt: "2025-07-02T20:31:53.286Z",
      otherResponsesWithSameFingerprint: [],
    },
    groupedShifts: [
      {
        id: "cmc6qxghx0001o2n1j6dhv0a4",
        name: "Outdoors for All Expo",
        description:
          "Party and celebrate the great outdoors the night before Paddlefest",
        eventId: "cmc6bzdj800038ouuxba0m122",
        address: "250 St Peters St",
        city: "Cincinnati",
        state: "Ohio",
        startTime: "2025-08-01T19:30:00.000Z",
        endTime: "2025-08-02T02:00:00.000Z",
        startTimeTz: "Eastern Standard Time",
        endTimeTz: "Eastern Standard Time",
        createdAt: "2025-06-21T21:23:46.243Z",
        updatedAt: "2025-06-23T01:41:46.418Z",
        deleted: false,
        jobs: [
          {
            id: "cmc6r2an9000go2n1p06430f3",
            name: "Volunteer Coordinator",
            description: "",
            restrictions: [],
            createdAt: "2025-06-21T21:27:31.941Z",
            updatedAt: "2025-06-21T21:27:31.941Z",
            deleted: false,
            capacity: 2,
            eventId: "cmc6bzdj800038ouuxba0m122",
            locationId: "cmc6qxghx0001o2n1j6dhv0a4",
            shifts: [
              {
                id: "cmc6r2an9000ho2n11hd2xwuv",
                eventId: "cmc6bzdj800038ouuxba0m122",
                createdAt: "2025-06-21T21:27:31.941Z",
                updatedAt: "2025-06-21T21:27:31.941Z",
                locationId: "cmc6qxghx0001o2n1j6dhv0a4",
                jobId: "cmc6r2an9000go2n1p06430f3",
                startTime: "2025-08-01T19:30:00.000Z",
                endTime: "2025-08-01T21:30:00.000Z",
                startTimeTz: "Eastern Standard Time",
                endTimeTz: "Eastern Standard Time",
                capacity: 2,
                open: true,
                active: true,
                deleted: false,
              },
              {
                id: "cmc6r2an9000io2n1kbxm9cbj",
                eventId: "cmc6bzdj800038ouuxba0m122",
                createdAt: "2025-06-21T21:27:31.941Z",
                updatedAt: "2025-06-21T21:27:31.941Z",
                locationId: "cmc6qxghx0001o2n1j6dhv0a4",
                jobId: "cmc6r2an9000go2n1p06430f3",
                startTime: "2025-08-01T21:30:00.000Z",
                endTime: "2025-08-01T23:30:00.000Z",
                startTimeTz: "Eastern Standard Time",
                endTimeTz: "Eastern Standard Time",
                capacity: 2,
                open: true,
                active: true,
                deleted: false,
              },
            ],
          },
          {
            id: "cmc6r68ef000yo2n1r9kqs1h8",
            name: "Green Team",
            description: "",
            restrictions: [],
            createdAt: "2025-06-21T21:30:35.656Z",
            updatedAt: "2025-06-21T21:30:35.656Z",
            deleted: false,
            capacity: 6,
            eventId: "cmc6bzdj800038ouuxba0m122",
            locationId: "cmc6qxghx0001o2n1j6dhv0a4",
            shifts: [
              {
                id: "cmc6r68eg0010o2n1z6xu1zur",
                eventId: "cmc6bzdj800038ouuxba0m122",
                createdAt: "2025-06-21T21:30:35.656Z",
                updatedAt: "2025-06-21T21:30:35.656Z",
                locationId: "cmc6qxghx0001o2n1j6dhv0a4",
                jobId: "cmc6r68ef000yo2n1r9kqs1h8",
                startTime: "2025-08-01T20:30:00.000Z",
                endTime: "2025-08-01T21:30:00.000Z",
                startTimeTz: "Eastern Standard Time",
                endTimeTz: "Eastern Standard Time",
                capacity: 6,
                open: true,
                active: true,
                deleted: false,
              },
            ],
          },
        ],
      },
      {
        id: "cmc6r02yu0009o2n1n1b4g98s",
        name: "4.5 Mile MINI Finish Line / 9.0 Mile Midpoint",
        description:
          "Cheer the paddlers on as they reach the halfway point of their paddle!",
        eventId: "cmc6bzdj800038ouuxba0m122",
        address: "100 Broadway",
        city: "Cincinnati",
        state: "Ohio",
        startTime: "2025-08-02T11:00:00.000Z",
        endTime: "2025-08-02T15:00:00.000Z",
        startTimeTz: "Eastern Standard Time",
        endTimeTz: "Eastern Standard Time",
        createdAt: "2025-06-21T21:25:48.678Z",
        updatedAt: "2025-06-23T01:42:35.761Z",
        deleted: false,
        jobs: [
          {
            id: "cmc6s1ifi000wo2km8xu050fx",
            name: "Public Landing bus coordinator",
            description: "",
            restrictions: [],
            createdAt: "2025-06-21T21:54:54.991Z",
            updatedAt: "2025-06-21T21:54:54.991Z",
            deleted: false,
            capacity: 2,
            eventId: "cmc6bzdj800038ouuxba0m122",
            locationId: "cmc6r02yu0009o2n1n1b4g98s",
            shifts: [
              {
                id: "cmc6s1ifi000xo2kmk2qoka71",
                eventId: "cmc6bzdj800038ouuxba0m122",
                createdAt: "2025-06-21T21:54:54.991Z",
                updatedAt: "2025-06-21T21:54:54.991Z",
                locationId: "cmc6r02yu0009o2n1n1b4g98s",
                jobId: "cmc6s1ifi000wo2km8xu050fx",
                startTime: "2025-08-02T12:00:00.000Z",
                endTime: "2025-08-02T15:00:00.000Z",
                startTimeTz: "Eastern Standard Time",
                endTimeTz: "Eastern Standard Time",
                capacity: 2,
                open: true,
                active: true,
                deleted: false,
              },
            ],
          },
        ],
      },
    ],
    shifts: [
      {
        id: "cmc6r2an9000ho2n11hd2xwuv",
        eventId: "cmc6bzdj800038ouuxba0m122",
        createdAt: "2025-06-21T21:27:31.941Z",
        updatedAt: "2025-06-21T21:27:31.941Z",
        locationId: "cmc6qxghx0001o2n1j6dhv0a4",
        jobId: "cmc6r2an9000go2n1p06430f3",
        startTime: "2025-08-01T19:30:00.000Z",
        endTime: "2025-08-01T21:30:00.000Z",
        startTimeTz: "Eastern Standard Time",
        endTimeTz: "Eastern Standard Time",
        capacity: 2,
        open: true,
        active: true,
        deleted: false,
        job: {
          id: "cmc6r2an9000go2n1p06430f3",
          name: "Volunteer Coordinator",
          description: "",
          restrictions: [],
          createdAt: "2025-06-21T21:27:31.941Z",
          updatedAt: "2025-06-21T21:27:31.941Z",
          deleted: false,
          capacity: 2,
          eventId: "cmc6bzdj800038ouuxba0m122",
          locationId: "cmc6qxghx0001o2n1j6dhv0a4",
          location: {
            id: "cmc6qxghx0001o2n1j6dhv0a4",
            name: "Outdoors for All Expo",
            description:
              "Party and celebrate the great outdoors the night before Paddlefest",
            eventId: "cmc6bzdj800038ouuxba0m122",
            address: "250 St Peters St",
            city: "Cincinnati",
            state: "Ohio",
            startTime: "2025-08-01T19:30:00.000Z",
            endTime: "2025-08-02T02:00:00.000Z",
            startTimeTz: "Eastern Standard Time",
            endTimeTz: "Eastern Standard Time",
            createdAt: "2025-06-21T21:23:46.243Z",
            updatedAt: "2025-06-23T01:41:46.418Z",
            deleted: false,
          },
        },
      },
      {
        id: "cmc6r2an9000io2n1kbxm9cbj",
        eventId: "cmc6bzdj800038ouuxba0m122",
        createdAt: "2025-06-21T21:27:31.941Z",
        updatedAt: "2025-06-21T21:27:31.941Z",
        locationId: "cmc6qxghx0001o2n1j6dhv0a4",
        jobId: "cmc6r2an9000go2n1p06430f3",
        startTime: "2025-08-01T21:30:00.000Z",
        endTime: "2025-08-01T23:30:00.000Z",
        startTimeTz: "Eastern Standard Time",
        endTimeTz: "Eastern Standard Time",
        capacity: 2,
        open: true,
        active: true,
        deleted: false,
        job: {
          id: "cmc6r2an9000go2n1p06430f3",
          name: "Volunteer Coordinator",
          description: "",
          restrictions: [],
          createdAt: "2025-06-21T21:27:31.941Z",
          updatedAt: "2025-06-21T21:27:31.941Z",
          deleted: false,
          capacity: 2,
          eventId: "cmc6bzdj800038ouuxba0m122",
          locationId: "cmc6qxghx0001o2n1j6dhv0a4",
          location: {
            id: "cmc6qxghx0001o2n1j6dhv0a4",
            name: "Outdoors for All Expo",
            description:
              "Party and celebrate the great outdoors the night before Paddlefest",
            eventId: "cmc6bzdj800038ouuxba0m122",
            address: "250 St Peters St",
            city: "Cincinnati",
            state: "Ohio",
            startTime: "2025-08-01T19:30:00.000Z",
            endTime: "2025-08-02T02:00:00.000Z",
            startTimeTz: "Eastern Standard Time",
            endTimeTz: "Eastern Standard Time",
            createdAt: "2025-06-21T21:23:46.243Z",
            updatedAt: "2025-06-23T01:41:46.418Z",
            deleted: false,
          },
        },
      },
      {
        id: "cmc6r68eg0010o2n1z6xu1zur",
        eventId: "cmc6bzdj800038ouuxba0m122",
        createdAt: "2025-06-21T21:30:35.656Z",
        updatedAt: "2025-06-21T21:30:35.656Z",
        locationId: "cmc6qxghx0001o2n1j6dhv0a4",
        jobId: "cmc6r68ef000yo2n1r9kqs1h8",
        startTime: "2025-08-01T20:30:00.000Z",
        endTime: "2025-08-01T21:30:00.000Z",
        startTimeTz: "Eastern Standard Time",
        endTimeTz: "Eastern Standard Time",
        capacity: 6,
        open: true,
        active: true,
        deleted: false,
        job: {
          id: "cmc6r68ef000yo2n1r9kqs1h8",
          name: "Green Team",
          description: "",
          restrictions: [],
          createdAt: "2025-06-21T21:30:35.656Z",
          updatedAt: "2025-06-21T21:30:35.656Z",
          deleted: false,
          capacity: 6,
          eventId: "cmc6bzdj800038ouuxba0m122",
          locationId: "cmc6qxghx0001o2n1j6dhv0a4",
          location: {
            id: "cmc6qxghx0001o2n1j6dhv0a4",
            name: "Outdoors for All Expo",
            description:
              "Party and celebrate the great outdoors the night before Paddlefest",
            eventId: "cmc6bzdj800038ouuxba0m122",
            address: "250 St Peters St",
            city: "Cincinnati",
            state: "Ohio",
            startTime: "2025-08-01T19:30:00.000Z",
            endTime: "2025-08-02T02:00:00.000Z",
            startTimeTz: "Eastern Standard Time",
            endTimeTz: "Eastern Standard Time",
            createdAt: "2025-06-21T21:23:46.243Z",
            updatedAt: "2025-06-23T01:41:46.418Z",
            deleted: false,
          },
        },
      },
      {
        id: "cmc6s1ifi000xo2kmk2qoka71",
        eventId: "cmc6bzdj800038ouuxba0m122",
        createdAt: "2025-06-21T21:54:54.991Z",
        updatedAt: "2025-06-21T21:54:54.991Z",
        locationId: "cmc6r02yu0009o2n1n1b4g98s",
        jobId: "cmc6s1ifi000wo2km8xu050fx",
        startTime: "2025-08-02T12:00:00.000Z",
        endTime: "2025-08-02T15:00:00.000Z",
        startTimeTz: "Eastern Standard Time",
        endTimeTz: "Eastern Standard Time",
        capacity: 2,
        open: true,
        active: true,
        deleted: false,
        job: {
          id: "cmc6s1ifi000wo2km8xu050fx",
          name: "Public Landing bus coordinator",
          description: "",
          restrictions: [],
          createdAt: "2025-06-21T21:54:54.991Z",
          updatedAt: "2025-06-21T21:54:54.991Z",
          deleted: false,
          capacity: 2,
          eventId: "cmc6bzdj800038ouuxba0m122",
          locationId: "cmc6r02yu0009o2n1n1b4g98s",
          location: {
            id: "cmc6r02yu0009o2n1n1b4g98s",
            name: "4.5 Mile MINI Finish Line / 9.0 Mile Midpoint",
            description:
              "Cheer the paddlers on as they reach the halfway point of their paddle!",
            eventId: "cmc6bzdj800038ouuxba0m122",
            address: "100 Broadway",
            city: "Cincinnati",
            state: "Ohio",
            startTime: "2025-08-02T11:00:00.000Z",
            endTime: "2025-08-02T15:00:00.000Z",
            startTimeTz: "Eastern Standard Time",
            endTimeTz: "Eastern Standard Time",
            createdAt: "2025-06-21T21:25:48.678Z",
            updatedAt: "2025-06-23T01:42:35.761Z",
            deleted: false,
          },
        },
      },
    ],
  },
  event: {
    name: "Ohio River Paddlefest",
  },
};

export default VolunteerFormResponseThankYouEmail;
