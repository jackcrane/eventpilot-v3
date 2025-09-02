const pii = {
  fingerprint: "fed4a8dd69ba70347d0bad6aff3fe5c7",
  location: {
    country_code: "US",
    country_name: "United States",
    city: "San Francisco",
    postal: "94119",
    latitude: 37.7749,
    longitude: -122.4194,
    IPv4: "136.144.43.72",
    state: "California",
  },
  tz: "America/Chicago",
  browser: {
    name: "Arc",
    version: "139.0.0.0",
    major: "139",
  },
  device: {
    model: "Macintosh",
    vendor: "Apple",
  },
  os: {
    name: "macOS",
    version: "10.15.7",
  },
  screenWidth: 744,
  screenHeight: 798,
};

const availableShifts = [
  {
    value: "cmf220ptg000bo2vrtv34jznx",
    label: "4:00 pm - 6:30 pm ",
    id: "cmf220ptg000bo2vrtv34jznx",
    eventId: "cmf1xtte80005o2bss6rvxq7b",
    createdAt: "2025-09-02T04:34:30.195Z",
    updatedAt: "2025-09-02T04:34:30.195Z",
    instanceId: "cmf1xtte90008o2bs2pnh7cp9",
    startTime: "2026-07-24T20:00:00.000Z",
    endTime: "2026-07-24T22:30:00.000Z",
    startTimeTz: "Eastern Standard Time",
    endTimeTz: "Eastern Standard Time",
    capacity: 0,
    open: true,
    active: true,
    deleted: false,
    jobId: "cmf220ptf000ao2vrp5gnzlmj",
    locationId: "cmf21yk5e0003o2vrtj113hjw",
  },
  {
    value: "cmf220ptg000co2vrezoohxy4",
    label: "6:30 pm - 9:00 pm ",
    id: "cmf220ptg000co2vrezoohxy4",
    eventId: "cmf1xtte80005o2bss6rvxq7b",
    createdAt: "2025-09-02T04:34:30.195Z",
    updatedAt: "2025-09-02T04:34:30.195Z",
    instanceId: "cmf1xtte90008o2bs2pnh7cp9",
    startTime: "2026-07-24T22:30:00.000Z",
    endTime: "2026-07-25T01:00:00.000Z",
    startTimeTz: "Eastern Standard Time",
    endTimeTz: "Eastern Standard Time",
    capacity: 0,
    open: true,
    active: true,
    deleted: false,
    jobId: "cmf220ptf000ao2vrp5gnzlmj",
    locationId: "cmf21yk5e0003o2vrtj113hjw",
  },
  {
    value: "cmf221f4w000go2vrsh70yg0d",
    label: "6:00 am - 9:00 am ",
    id: "cmf221f4w000go2vrsh70yg0d",
    eventId: "cmf1xtte80005o2bss6rvxq7b",
    createdAt: "2025-09-02T04:35:03.008Z",
    updatedAt: "2025-09-02T04:35:03.008Z",
    locationId: "cmf21zlak0007o2vrrolt647r",
    instanceId: "cmf1xtte90008o2bs2pnh7cp9",
    jobId: "cmf221f4w000fo2vrtg1jyc5x",
    startTime: "2026-07-25T10:00:00.000Z",
    endTime: "2026-07-25T13:00:00.000Z",
    startTimeTz: "Eastern Standard Time",
    endTimeTz: "Eastern Standard Time",
    capacity: 0,
    open: true,
    active: true,
    deleted: false,
  },
  {
    value: "cmf221f4w000ho2vrxadcakgk",
    label: "9:00 am - 12:00 pm ",
    id: "cmf221f4w000ho2vrxadcakgk",
    eventId: "cmf1xtte80005o2bss6rvxq7b",
    createdAt: "2025-09-02T04:35:03.008Z",
    updatedAt: "2025-09-02T04:35:03.008Z",
    locationId: "cmf21zlak0007o2vrrolt647r",
    instanceId: "cmf1xtte90008o2bs2pnh7cp9",
    jobId: "cmf221f4w000fo2vrtg1jyc5x",
    startTime: "2026-07-25T13:00:00.000Z",
    endTime: "2026-07-25T16:00:00.000Z",
    startTimeTz: "Eastern Standard Time",
    endTimeTz: "Eastern Standard Time",
    capacity: 0,
    open: true,
    active: true,
    deleted: false,
  },
];

export const pickRandomItems = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("Input must be a non-empty array");
  }

  // Decide how many items to pick (between 1 and arr.length)
  const count = Math.floor(Math.random() * arr.length) + 1;

  // Shuffle a copy of the array and take the first `count`
  const shuffled = [...arr].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count);
};

const fnames = [
  "Alice",
  "Amelia",
  "Anna",
  "Ava",
  "Bob",
  "Brian",
  "Caroline",
  "Carol",
  "Chloe",
  "Charlie",
  "Daniel",
  "David",
  "Ella",
  "Eve",
  "Evelyn",
  "Frank",
  "George",
  "Grace",
  "Hannah",
  "Heidi",
  "Henry",
  "Isabella",
  "Ivan",
  "Jack",
  "Judy",
  "Julia",
  "Kate",
  "Kim",
  "Liam",
  "Lucas",
  "Lucy",
  "Madison",
  "Maria",
  "Mary",
  "Matthew",
  "Natalie",
  "Oliver",
  "Olivia",
  "Peter",
  "Rachel",
  "Rebecca",
  "Richard",
  "Quinn",
  "Sarah",
  "Tom",
  "Uma",
  "Victor",
  "William",
  "Xavier",
  "Yang",
  "Zachary",
];

const lnames = [
  "Adams",
  "Alexander",
  "Allen",
  "Anderson",
  "Bailey",
  "Baker",
  "Barnes",
  "Bell",
  "Bennett",
  "Brooks",
  "Brown",
  "Carter",
  "Clark",
  "Cooper",
  "Cox",
  "Davis",
  "Daniels",
  "Edwards",
  "Evans",
  "Flores",
  "Foster",
  "Garcia",
  "Gomez",
  "Gonzalez",
  "Green",
  "Hall",
  "Harris",
  "Hayes",
  "Henderson",
  "Hernandez",
  "Hill",
  "Howard",
  "Jackson",
  "James",
  "Jenkins",
  "Johnson",
  "Jones",
  "Kelly",
  "King",
  "Lee",
  "Lewis",
  "Lopez",
  "Martin",
  "Martinez",
  "Miller",
  "Mitchell",
  "Moore",
  "Morgan",
  "Morris",
  "Murphy",
  "Nelson",
  "Parker",
  "Patterson",
  "Perez",
  "Peterson",
  "Phillips",
  "Powell",
  "Ramirez",
  "Reed",
  "Richardson",
  "Rivera",
  "Roberts",
  "Robinson",
  "Rodriguez",
  "Russell",
  "Sanchez",
  "Sanders",
  "Scott",
  "Smith",
  "Stewart",
  "Taylor",
  "Thomas",
  "Thompson",
  "Torres",
  "Turner",
  "Walker",
  "Ward",
  "Washington",
  "Watson",
  "White",
  "Williams",
  "Wilson",
  "Wood",
  "Wright",
  "Young",
];

let j = 0;

const generateRegistration = async () => {
  const startTime = performance.now();
  const firstName = pickRandomItems(fnames);
  const lastName = pickRandomItems(lnames);

  const email = (
    firstName[0] +
    "." +
    lastName[0] +
    "@eventpilot-test.com"
  ).toLowerCase();
  const name = firstName[0] + " " + lastName[0];

  const data = {
    values: {
      1756787521757: name,
      1756787523823: email,
    },
    shifts: pickRandomItems(availableShifts),
    pii,
  };

  const res = await fetch(
    "http://localhost:3000/api/events/flying-pig/submission",
    {
      method: "POST",
      headers: {
        "X-Instance": "cmf1xtte90008o2bs2pnh7cp9",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (res.status !== 200) {
    console.log(res.status);
    throw new Error("Error submitting registration");
  }

  const response = await res.json();

  const endTime = performance.now();
  const elapsedInSeconds = (endTime - startTime) / 1000;

  if (response.id) {
    console.log(
      j,
      "Successfully submitted registration:",
      response.id,
      elapsedInSeconds.toFixed(2) + "s"
    );
    j++;
  }
};

for (let i = 0; i < 260 - 109; i++) {
  await generateRegistration();
}

/**

SQL to change createdAt dates


UPDATE "FormResponse" fr
SET "createdAt" = LEAST(
  (
    (
      -- pick a day within the past 75 days, smoother recency bias
      (DATE '2025-09-01'
       - (FLOOR(POWER(random(), 1.7) * 75))::int
      )::timestamp
      +
      -- randomly nudge some rows forward 0–2 days → creates a few empty days
      make_interval(days => (CASE WHEN random() < 0.12 THEN (FLOOR(random() * 3))::int ELSE 0 END))
      +
      -- pick time of day
      CASE
        WHEN random() < 0.80 THEN
          make_interval(
            hours => (13 + FLOOR(random() * 8))::int,  -- 1–8pm
            mins  => FLOOR(random() * 60)::int,
            secs  => FLOOR(random() * 60)::int
          )
        WHEN random() < 0.92 THEN
          make_interval(
            hours => (8 + FLOOR(random() * 4))::int,   -- 8–11am
            mins  => FLOOR(random() * 60)::int,
            secs  => FLOOR(random() * 60)::int
          )
        ELSE
          make_interval(
            hours => FLOOR(random() * 24)::int,        -- any time
            mins  => FLOOR(random() * 60)::int,
            secs  => FLOOR(random() * 60)::int
          )
      END
    ) AT TIME ZONE 'America/New_York'
  ),
  (TIMESTAMP '2025-09-01 23:59:59' AT TIME ZONE 'America/New_York'),
  now()
)
WHERE fr."eventId"    = 'cmf1xtte80005o2bss6rvxq7b'
  AND fr."instanceId" = 'cmf1xtte90008o2bs2pnh7cp9';


 */
