// Unified fake data generator for volunteers and participants
// - Works for both VolunteerRegistration and Registration (participants)
// - Automatically loads fields, shifts, periods/pricing, upsells, teams, coupons
// - Configurable via CLI flags and/or a JSON config file
// - Sets createdAt timestamps with a ramp distribution toward instance start
// - Avoids external services (Stripe/Postmark); writes directly with Prisma
// - Uses @faker-js/faker if available, otherwise falls back to a minimal local generator

import "dotenv/config";
import { prisma } from "#prisma";
import { createLedgerItemForRegistration } from "../util/ledger.js";

// Try to use @faker-js/faker; provide a local fallback otherwise
let faker;
try {
  // eslint-disable-next-line
  ({ faker } = await import("@faker-js/faker"));
  //eslint-disable-next-line
} catch (_) {
  // Lightweight fallback so the script still runs without network installs
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
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const rand = () => Math.random().toString(36).slice(2, 8);
  faker = {
    person: {
      firstName: () => pick(fnames),
      lastName: () => pick(lnames),
      fullName: () => {
        const f = pick(fnames);
        const l = pick(lnames);
        return `${f} ${l}`;
      },
    },
    internet: {
      email: (first, last) => {
        const f = (first || pick(fnames)).toLowerCase();
        const l = (last || pick(lnames)).toLowerCase();
        return `${f}.${l}.${rand()}@eventpilot-test.com`;
      },
      userAgent: () => `FakeDataGenerator/1.0 (+${rand()})`,
    },
    phone: {
      number: () =>
        `(${randomInt(200, 989)}) ${randomInt(200, 989)}-${randomInt(1000, 9999)}`,
    },
    location: {
      city: () => "Springfield",
      state: () => "IL",
      zipCode: () => `${randomInt(10000, 99999)}`,
      streetAddress: () => `${randomInt(100, 9999)} Main St`,
    },
    string: {
      uuid: () => `${rand()}-${rand()}-${rand()}-${rand()}`,
    },
    lorem: {
      sentence: () => "Lorem ipsum dolor sit amet.",
      paragraph: () =>
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer et porta nisl.",
    },
    helpers: {
      arrayElement: (arr) => pick(arr),
    },
  };
}

// --- Simple CLI parsing ---
const args = process.argv.slice(2);
const getArg = (name, def = undefined) => {
  const i = args.findIndex((a) => a === `--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  if (!v || v.startsWith("--")) return true; // boolean flag
  return v;
};

// CLI options
const configPath = getArg("config", null);
const eventRef = getArg("event", null); // ID or slug
const instanceId = getArg("instance", null);
const volunteersTotal = Number(getArg("volunteers", 0));
const participantsTotal = Number(getArg("participants", 0));
const includeFuture = getArg("includeFuture", "false") !== "false";
const horizonDays = Number(getArg("horizonDays", 75));
const rampPower = Number(getArg("rampPower", 1.7));
const startDateArg = getArg("start", null);
const endDateArg = getArg("end", null);
const seedArg = getArg("seed", null);

// Volunteer-specific knobs
const minShifts = Number(getArg("minShifts", 0));
const maxShifts = Number(getArg("maxShifts", 2));

// Participant-specific knobs
const upsellChance = Number(getArg("upsellChance", 0.4));
const couponChance = Number(getArg("couponChance", 0.2));
const teamChance = Number(getArg("teamChance", 0.35));
const paySuccessChance = Number(getArg("paySuccessChance", 0.95));

// Allow a JSON config file to override defaults
import fs from "node:fs";
import path from "node:path";
let fileCfg = {};
if (configPath) {
  try {
    const abs = path.isAbsolute(configPath)
      ? configPath
      : path.join(process.cwd(), configPath);
    const raw = fs.readFileSync(abs, "utf8");
    fileCfg = JSON.parse(raw);
  } catch (e) {
    console.warn(`Could not read config at ${configPath}:`, e.message);
  }
}

const cfg = {
  common: {
    includeFuture,
    horizonDays,
    rampPower,
    startDate: startDateArg,
    endDate: endDateArg,
    seed: seedArg,
    ...(fileCfg.common || {}),
  },
  volunteers: {
    total: volunteersTotal,
    minShifts,
    maxShifts,
    fieldMapping: fileCfg.volunteers?.fieldMapping || {},
  },
  participants: {
    total: participantsTotal,
    upsellChance,
    couponChance,
    teamChance,
    paySuccessChance,
    fieldMapping: fileCfg.participants?.fieldMapping || {},
  },
};

// Seeding for deterministic runs (if faker available)
if (cfg.common.seed && faker?.seed) {
  faker.seed(Number(cfg.common.seed));
}

// --- Utility helpers ---
const asDate = (v) => (v ? new Date(v) : null);
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
//eslint-disable-next-line
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Time-of-day preference similar to the old SQL (mostly afternoons)
const randomTimeOfDay = (baseDate) => {
  const r = Math.random();
  let h;
  if (r < 0.8)
    h = 13 + Math.floor(Math.random() * 8); // 1–8pm
  else if (r < 0.92)
    h = 8 + Math.floor(Math.random() * 4); // 8–11am
  else h = Math.floor(Math.random() * 24); // any time
  const m = Math.floor(Math.random() * 60);
  const s = Math.floor(Math.random() * 60);
  const ts = new Date(baseDate);
  ts.setHours(h, m, s, 0);
  return ts;
};

// Build a ramped per-day schedule
const buildSchedule = (total, startDate, endDate, power = 1.7) => {
  if (total <= 0) return [];
  const days = [];
  let cur = startOfDay(startDate);
  const end = startOfDay(endDate);
  while (cur <= end) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  const n = days.length;
  const weights = days.map((_, i) => Math.pow(i + 1, power));
  const sum = weights.reduce((a, b) => a + b, 0);
  const perDayCounts = days.map((_, i) =>
    Math.floor((weights[i] / sum) * total)
  );
  let assigned = perDayCounts.reduce((a, b) => a + b, 0);
  // distribute remaining
  let idx = n - 1;
  while (assigned < total) {
    perDayCounts[idx] += 1;
    assigned += 1;
    idx = Math.max(0, idx - 1);
  }
  // Emit timestamps per record
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < perDayCounts[i]; j++) {
      out.push(randomTimeOfDay(days[i]));
    }
  }
  return out.sort((a, b) => a - b);
};

// --- Data loaders ---
const resolveEventAndInstance = async (eventRef, instanceId) => {
  if (!instanceId) throw new Error("Missing --instance");

  // If eventRef provided, resolve directly; otherwise infer from instance
  let event = null;
  if (eventRef) {
    event = await prisma.event.findFirst({
      where: { OR: [{ id: eventRef }, { slug: eventRef }] },
      select: { id: true, name: true },
    });
    if (!event) throw new Error(`Event not found: ${eventRef}`);
  }

  const instance = await prisma.eventInstance.findFirst({
    where: event ? { id: instanceId, eventId: event.id } : { id: instanceId },
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      eventId: true,
    },
  });
  if (!instance) throw new Error(`Instance not found: ${instanceId}`);

  if (!event) {
    event = await prisma.event.findUnique({
      where: { id: instance.eventId },
      select: { id: true, name: true },
    });
    if (!event)
      throw new Error(`Event for instance not found: ${instance.eventId}`);
  }

  return { event, instance };
};

const loadVolunteerFields = async (eventId, instanceId) => {
  return prisma.volunteerRegistrationField.findMany({
    where: { eventId, instanceId, deleted: false },
    orderBy: { order: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      eventpilotFieldType: true,
      options: {
        select: { id: true, label: true, deleted: true },
        orderBy: { order: "asc" },
      },
    },
  });
};

const loadShifts = async (eventId, instanceId) =>
  prisma.shift.findMany({
    where: { eventId, instanceId, deleted: false, open: true, active: true },
    select: { id: true, startTime: true, endTime: true, capacity: true },
  });

const loadRegistrationFields = async (eventId, instanceId) =>
  prisma.registrationField.findMany({
    where: { eventId, instanceId, deleted: false },
    orderBy: { order: "asc" },
    include: {
      options: { where: { deleted: false }, orderBy: { order: "asc" } },
    },
  });

const loadPeriodsPricing = async (eventId, instanceId) =>
  prisma.registrationPeriodPricing.findMany({
    where: { eventId, instanceId, deleted: false, available: true },
    include: { registrationPeriod: true, registrationTier: true },
  });

const loadUpsells = async (eventId, instanceId) =>
  prisma.upsellItem.findMany({
    where: { eventId, instanceId, deleted: false },
  });

const loadTeams = async (eventId, instanceId) =>
  prisma.team.findMany({ where: { eventId, instanceId, deleted: false } });

const loadCoupons = async (eventId, instanceId) =>
  prisma.coupon.findMany({ where: { eventId, instanceId, deleted: false } });

// --- Field value mapping ---
const defaultVolunteerValueFor = (field, person) => {
  const t = (field.eventpilotFieldType || field.type || "").toLowerCase();
  const label = (field.label || "").toLowerCase();
  if (
    t === "pagebreak" ||
    t === "shiftpicker" ||
    t === "header" ||
    t === "info"
  )
    return null;
  if (t === "volunteername" || label.includes("name")) return person.name;
  if (t === "volunteeremail" || label.includes("email")) return person.email;
  if (label.includes("phone")) return person.phone;
  if (label.includes("city")) return person.city;
  if (label.includes("state")) return person.state;
  if (label.includes("zip")) return person.zip;
  if (label.includes("address")) return person.address;
  // options → pick label
  if (Array.isArray(field.options) && field.options.length) {
    const opt = faker.helpers.arrayElement(
      field.options.filter((o) => !o.deleted)
    );
    return opt?.label ?? null;
  }
  // fallback
  return faker.lorem.sentence();
};

const defaultRegistrationValueFor = (field, person) => {
  // Prefer semantic fieldType when present (e.g., participantName/email)
  const ft = (field.fieldType || "").toLowerCase();
  const label = (field.label || "").toLowerCase();

  if (ft === "participantname" || label.includes("name")) return person.name;
  if (ft === "participantemail" || label.includes("email")) return person.email;
  if (ft === "participantphone" || label.includes("phone")) return person.phone;
  if (label.includes("city")) return person.city;
  if (label.includes("state")) return person.state;
  if (label.includes("zip")) return person.zip;
  if (label.includes("address")) return person.address;

  switch (field.type) {
    case "EMAIL":
      return person.email;
    case "TEXT":
      return faker.lorem.sentence();
    case "TEXTAREA":
      return faker.lorem.paragraph();
    case "CHECKBOX":
      return Math.random() < 0.5 ? "true" : "false";
    case "DROPDOWN":
      return field.options?.length
        ? (faker.helpers.arrayElement(field.options)?.id ?? null)
        : null;
    case "RICHTEXT":
      return faker.lorem.paragraph();
    // These are handled via explicit relations, not stored as field responses
    case "REGISTRATIONTIER":
    case "UPSELLS":
    case "TEAM":
      return null;
    default:
      return faker.lorem.sentence();
  }
};

// Allow user overrides by eventpilotFieldType or label/type
const volunteerValueFor = (field, person, mapping = {}) => {
  const key = field.eventpilotFieldType || field.type || field.label;
  if (key && mapping[key]) return runFakerPath(mapping[key], person);
  return defaultVolunteerValueFor(field, person);
};

const registrationValueFor = (field, person, mapping = {}) => {
  const key = field.fieldType || field.type || field.label;
  if (key && mapping[key]) return runFakerPath(mapping[key], person);
  return defaultRegistrationValueFor(field, person);
};

// Resolve a string path like "person.fullName" or "internet.email" to a value
const runFakerPath = (path, person) => {
  try {
    if (path === "person.fullName") return person.name;
    if (path === "internet.email") return person.email;
    if (path === "phone.number") return person.phone;
    if (path === "location.city") return person.city;
    if (path === "location.state") return person.state;
    if (path === "location.streetAddress") return person.address;
    // generic: follow faker[path]
    const parts = path.split(".");
    let cur = faker;
    for (const p of parts) cur = cur?.[p];
    if (typeof cur === "function") return cur();
    return cur ?? null;
  } catch {
    return null;
  }
};

// Build a random person
const makePerson = () => {
  const first = faker.person.firstName();
  const last = faker.person.lastName();
  const name = `${first} ${last}`;
  const email = faker.internet.email(first, last);
  const phone = faker.phone.number();
  const city = faker.location?.city ? faker.location.city() : "Springfield";
  const state = faker.location?.state ? faker.location.state() : "IL";
  const zip = faker.location?.zipCode ? faker.location.zipCode() : "60606";
  const address = faker.location?.streetAddress
    ? faker.location.streetAddress()
    : "123 Main St";
  return { first, last, name, email, phone, city, state, zip, address };
};

const maybePickSome = (arr, maxCount = 2) => {
  if (!arr?.length) return [];
  const c = Math.max(
    0,
    Math.min(maxCount, Math.floor(Math.random() * (maxCount + 1)))
  );
  if (c === 0) return [];
  // shuffle copy
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, c);
};

// Pick a pricing row active at "when"; fallback to any available
const pickPricingForDate = (list, when) => {
  if (!list?.length) return null;
  const active = list.filter(
    (p) =>
      new Date(p.registrationPeriod.startTime) <= when &&
      when <= new Date(p.registrationPeriod.endTime)
  );
  if (active.length) return active[Math.floor(Math.random() * active.length)];
  return list[Math.floor(Math.random() * list.length)];
};

// --- Writers ---
const createVolunteer = async ({
  eventId,
  instanceId,
  createdAt,
  shifts,
  fields,
  fieldMapping,
}) => {
  const person = makePerson();

  const fieldResponses = [];
  for (const f of fields) {
    const val = volunteerValueFor(f, person, fieldMapping);
    if (val == null) continue;
    fieldResponses.push({ fieldId: f.id, value: String(val) });
  }

  const pii = {
    fingerprint: faker.string.uuid(),
    tz: "America/Chicago",
    userAgent: faker.internet.userAgent(),
    ipAddress: "127.0.0.1",
  };

  const vr = await prisma.volunteerRegistration.create({
    data: {
      eventId,
      instanceId,
      createdAt,
      fieldResponses: { create: fieldResponses },
      pii: { create: pii },
    },
    select: { id: true },
  });

  // Attach shifts (subset)
  const pickCount = Math.max(
    0,
    Math.min(
      shifts.length,
      Math.floor(
        Math.random() *
          (cfg.volunteers.maxShifts - cfg.volunteers.minShifts + 1)
      ) + cfg.volunteers.minShifts
    )
  );
  if (pickCount > 0 && shifts.length > 0) {
    const shuffled = [...shifts]
      .sort(() => Math.random() - 0.5)
      .slice(0, pickCount);
    await prisma.volunteerShiftSignup.createMany({
      data: shuffled.map((s) => ({
        formResponseId: vr.id,
        shiftId: s.id,
        createdAt,
      })),
      skipDuplicates: true,
    });
  }

  // Create/link CRM person for the volunteer
  const existing = await prisma.crmPerson.findFirst({
    where: { eventId, emails: { some: { email: person.email } } },
    select: { id: true },
  });
  if (existing) {
    // ensure the link exists
    const link = await prisma.crmPersonLink.findFirst({
      where: { crmPersonId: existing.id, formResponseId: vr.id },
    });
    if (!link) {
      await prisma.crmPerson.update({
        where: { id: existing.id },
        data: { links: { create: { formResponseId: vr.id } } },
      });
    }
  } else {
    await prisma.crmPerson.create({
      data: {
        name: person.name,
        eventId,
        source: "VOLUNTEER",
        emails: { create: { email: person.email } },
        links: { create: { formResponseId: vr.id } },
      },
    });
  }
};

const createParticipant = async ({
  eventId,
  instanceId,
  createdAt,
  fields,
  pricingList,
  upsells,
  teams,
  coupons,
  fieldMapping,
}) => {
  const person = makePerson();

  // Choose pricing row by createdAt
  const pickedPricing = pickPricingForDate(pricingList, createdAt);
  // Build registration record (start as not finalized; we may finalize below)
  const reg = await prisma.registration.create({
    data: {
      eventId,
      instanceId,
      createdAt,
      registrationPeriodPricingId: pickedPricing?.id ?? null,
      registrationTierId: pickedPricing?.registrationTierId ?? null,
      registrationPeriodId: pickedPricing?.registrationPeriodId ?? null,
      priceSnapshot: pickedPricing?.price ?? 0,
      finalized: false,
    },
    select: { id: true },
  });

  // Field responses (skip special types)
  const inserts = [];
  for (const f of fields) {
    const val = registrationValueFor(f, person, fieldMapping);
    if (val == null) continue;
    if (f.type === "DROPDOWN")
      inserts.push({
        registrationId: reg.id,
        fieldId: f.id,
        optionId: val,
        instanceId,
      });
    else
      inserts.push({
        registrationId: reg.id,
        fieldId: f.id,
        value: String(val),
        instanceId,
      });
  }
  if (inserts.length)
    await prisma.registrationFieldResponse.createMany({ data: inserts });

  // Maybe attach upsells first (used in price calc)
  const addUpsells = Math.random() < cfg.participants.upsellChance;
  const chosenUpsells =
    addUpsells && upsells?.length ? maybePickSome(upsells, 2) : [];
  if (chosenUpsells.length) {
    await prisma.registrationUpsell.createMany({
      data: chosenUpsells.map((u) => ({
        registrationId: reg.id,
        upsellItemId: u.id,
        quantity: 1,
        priceSnapshot: u.price,
      })),
      skipDuplicates: true,
    });
  }

  // Maybe join a team
  if (Math.random() < cfg.participants.teamChance && teams?.length) {
    const team = teams[Math.floor(Math.random() * teams.length)];
    await prisma.registration.update({
      where: { id: reg.id },
      data: { teamId: team.id },
    });
  }

  // Maybe attach a coupon (validate like consumer flow: expiry + redemption caps)
  let chosenCoupon =
    Math.random() < cfg.participants.couponChance && coupons?.length
      ? coupons[Math.floor(Math.random() * coupons.length)]
      : null;
  if (chosenCoupon) {
    const now = createdAt || new Date();
    const expired = chosenCoupon.endsAt && new Date(chosenCoupon.endsAt) < now;
    if (expired) {
      chosenCoupon = null;
    } else if (chosenCoupon.maxRedemptions !== -1) {
      const used = await prisma.registration.count({
        where: { couponId: chosenCoupon.id, deleted: false, finalized: true },
      });
      if (used >= chosenCoupon.maxRedemptions) {
        chosenCoupon = null;
      }
    }
  }
  if (chosenCoupon) {
    await prisma.registration.update({
      where: { id: reg.id },
      data: { couponId: chosenCoupon.id },
    });
  }

  // Compute payment total similar to registrationRequiresPayment
  const regPrice = pickedPricing?.price ?? 0;
  const upsellTotal = chosenUpsells.reduce((sum, u) => sum + (u.price || 0), 0);
  const totalBefore = regPrice + upsellTotal;
  let discount = 0;
  if (chosenCoupon) {
    let eligible = 0;
    if (chosenCoupon.appliesTo === "BOTH") eligible = totalBefore;
    else if (chosenCoupon.appliesTo === "REGISTRATION") eligible = regPrice;
    else if (chosenCoupon.appliesTo === "UPSELLS") eligible = upsellTotal;

    if (eligible > 0) {
      if (chosenCoupon.discountType === "FLAT") discount = chosenCoupon.amount;
      else if (chosenCoupon.discountType === "PERCENT")
        discount = (eligible * chosenCoupon.amount) / 100;
      if (discount > eligible) discount = eligible;
    }
  }
  let total = totalBefore - discount;
  if (total < 0) total = 0;

  const requiresPayment = total >= 0.3;
  let paid = false;
  if (!requiresPayment) {
    paid = true; // free registrations auto-finalize
  } else if (Math.random() < cfg.participants.paySuccessChance) {
    paid = true;
  }

  if (paid) {
    // Create ledger item only if there was a non-zero payment required
    if (requiresPayment) {
      // Mirror webhook path: create ledger item via shared util
      await createLedgerItemForRegistration({
        eventId,
        instanceId,
        registrationId: reg.id,
        amount: total,
      });
    }

    await prisma.registration.update({
      where: { id: reg.id },
      data: { finalized: true },
    });

    // Mirror the confirmation log without sending email
    await prisma.logs.create({
      data: {
        type: "REGISTRATION_CONFIRMED",
        eventId,
        registrationId: reg.id,
        instanceId,
        data: { simulated: true, total },
        createdAt,
      },
    });
  }

  // Link or create CRM person
  const existing = await prisma.crmPerson.findFirst({
    where: { eventId, emails: { some: { email: person.email } } },
    select: { id: true },
  });
  if (existing) {
    await prisma.crmPerson.update({
      where: { id: existing.id },
      data: { registrations: { connect: { id: reg.id } } },
    });
  } else {
    await prisma.crmPerson.create({
      data: {
        name: person.name,
        eventId,
        source: "REGISTRATION",
        emails: { create: { email: person.email } },
        registrations: { connect: { id: reg.id } },
      },
    });
  }
};

// --- Main ---
const main = async () => {
  const { event, instance } = await resolveEventAndInstance(
    eventRef,
    instanceId
  );

  // Date window
  let startDate = cfg.common.startDate
    ? asDate(cfg.common.startDate)
    : addDays(instance.startTime, -cfg.common.horizonDays);
  const today = new Date();
  let endDate = cfg.common.endDate
    ? asDate(cfg.common.endDate)
    : cfg.common.includeFuture
      ? new Date(instance.startTime)
      : today < instance.startTime
        ? today
        : new Date(instance.startTime);

  if (startDate > endDate) {
    // swap if misconfigured
    const tmp = startDate;
    startDate = endDate;
    endDate = tmp;
  }

  // Preload lookups
  const [vFields, vShifts, rFields, pricing, upsells, teams, coupons] =
    await Promise.all([
      loadVolunteerFields(event.id, instance.id),
      loadShifts(event.id, instance.id),
      loadRegistrationFields(event.id, instance.id),
      loadPeriodsPricing(event.id, instance.id),
      loadUpsells(event.id, instance.id),
      loadTeams(event.id, instance.id),
      loadCoupons(event.id, instance.id),
    ]);

  // Build schedules
  const volunteerTimes = buildSchedule(
    cfg.volunteers.total || 0,
    startDate,
    endDate,
    cfg.common.rampPower
  );
  const participantTimes = buildSchedule(
    cfg.participants.total || 0,
    startDate,
    endDate,
    cfg.common.rampPower
  );

  // Create volunteers
  for (let i = 0; i < volunteerTimes.length; i++) {
    const createdAt = volunteerTimes[i];
    await createVolunteer({
      eventId: event.id,
      instanceId: instance.id,
      createdAt,
      shifts: vShifts,
      fields: vFields,
      fieldMapping: cfg.volunteers.fieldMapping,
    });
    if ((i + 1) % 50 === 0)
      console.log(`[volunteers] created ${i + 1}/${volunteerTimes.length}`);
  }

  // Create participants
  for (let i = 0; i < participantTimes.length; i++) {
    const createdAt = participantTimes[i];
    await createParticipant({
      eventId: event.id,
      instanceId: instance.id,
      createdAt,
      fields: rFields,
      pricingList: pricing,
      upsells,
      teams,
      coupons,
      fieldMapping: cfg.participants.fieldMapping,
    });
    if ((i + 1) % 50 === 0)
      console.log(`[participants] created ${i + 1}/${participantTimes.length}`);
  }

  console.log("Done.", {
    volunteersCreated: volunteerTimes.length,
    participantsCreated: participantTimes.length,
    window: { startDate, endDate },
    event: event.id,
    instance: instance.id,
  });
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
