import { formatFieldResponses } from "./formatFieldResponses.js";

const sortValues = (values) =>
  Array.from(values).sort((a, b) => a.localeCompare(b));

export const createParticipantStatsMap = (registrations = []) => {
  const accumulator = new Map();

  for (const reg of registrations) {
    if (!reg.crmPersonId) continue;
    let summary = accumulator.get(reg.crmPersonId);
    if (!summary) {
      summary = {
        total: 0,
        finalized: 0,
        latest: null,
        registrations: [],
        tiers: new Set(),
        periods: new Set(),
        teams: new Set(),
        coupons: new Set(),
        upsellTotals: new Map(),
        fieldValues: new Map(),
      };
      accumulator.set(reg.crmPersonId, summary);
    }

    const detail = {
      id: reg.id,
      createdAt: reg.createdAt,
      instanceId: reg.instance?.id ?? null,
      instanceName: reg.instance?.name ?? null,
      finalized: reg.finalized,
      tierId: reg.registrationTier?.id ?? null,
      tierName: reg.registrationTier?.name ?? null,
      periodId: reg.registrationPeriod?.id ?? null,
      periodName: reg.registrationPeriod?.name ?? null,
      teamId: reg.team?.id ?? null,
      teamName: reg.team?.name ?? null,
      couponCode: reg.coupon?.code || reg.coupon?.title || null,
      upsells: [],
      fieldValues: formatFieldResponses(reg.fieldResponses),
    };

    if (Array.isArray(reg.upsells)) {
      for (const upsell of reg.upsells) {
        const name = upsell?.upsellItem?.name?.trim();
        if (!name) continue;
        const quantity = Number(upsell.quantity || 0) || 0;
        const label = quantity > 1 ? `${name} ×${quantity}` : name;
        detail.upsells.push(label);
        const current = summary.upsellTotals.get(name) || 0;
        summary.upsellTotals.set(name, current + (quantity || 1));
      }
    }

    summary.total += 1;
    if (reg.finalized) summary.finalized += 1;
    summary.registrations.push(detail);
    if (detail.tierName) summary.tiers.add(detail.tierName);
    if (detail.periodName) summary.periods.add(detail.periodName);
    if (detail.teamName) summary.teams.add(detail.teamName);
    if (detail.couponCode) summary.coupons.add(detail.couponCode);

    if (detail.fieldValues?.length) {
      for (const field of detail.fieldValues) {
        const label = field.label;
        const value = field.value;
        if (!label || !value) continue;
        const existing = summary.fieldValues.get(label) || new Set();
        existing.add(value);
        summary.fieldValues.set(label, existing);
      }
    }
    if (!summary.latest) summary.latest = detail;
  }

  return new Map(
    [...accumulator.entries()].map(([personId, summary]) => [
      personId,
      {
        total: summary.total,
        finalized: summary.finalized,
        latest: summary.latest,
        registrations: summary.registrations,
        tiers: sortValues(summary.tiers),
        periods: sortValues(summary.periods),
        teams: sortValues(summary.teams),
        coupons: sortValues(summary.coupons),
        upsells: Array.from(summary.upsellTotals.entries())
          .map(([name, quantity]) =>
            quantity > 1 ? `${name} ×${quantity}` : name
          )
          .sort((a, b) => a.localeCompare(b)),
        fields: (() => {
          const output = {};
          for (const [label, values] of summary.fieldValues.entries()) {
            output[label] = Array.from(values).join(", ");
          }
          return output;
        })(),
      },
    ])
  );
};
