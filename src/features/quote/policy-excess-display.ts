export type PolicyExcessDisplayLine = {
  label: string;
  text: string;
};

type ExcessBand = {
  percentage: string;
  minimumAmount: string;
  included: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readBand(value: unknown): ExcessBand | null {
  const record = asRecord(value);
  if (!record) return null;

  const percentage = record.percentage;
  const minimumAmount = record.minimumAmount ?? record.minimum_amount;
  if (
    (typeof percentage !== 'string' && typeof percentage !== 'number') ||
    (typeof minimumAmount !== 'string' && typeof minimumAmount !== 'number')
  ) {
    return null;
  }

  const percentageText = String(percentage).trim();
  const minimumText = String(minimumAmount).trim();
  if (!percentageText || !minimumText) return null;

  return {
    percentage: percentageText,
    minimumAmount: minimumText,
    included: record.included !== false,
  };
}

function formatExcessMoney(currency: string, amount: string) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return `${currency} ${amount}`;
  }
  return `${currency} ${numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Build display lines from a quote/product policy excess snapshot. Empty when unavailable. */
export function buildPolicyExcessDisplayLines(
  value: unknown,
  currency: string,
): PolicyExcessDisplayLine[] {
  const record = asRecord(value);
  if (!record) return [];

  const ownDamage =
    readBand(record.ownDamage ?? record.own_damage) ??
    readBand(record.ownDamageThirdParty ?? record.own_damage_third_party);
  const thirdPartyDamage =
    readBand(record.thirdPartyDamage ?? record.third_party_damage) ??
    readBand(record.ownDamageThirdParty ?? record.own_damage_third_party);
  const youngDrivers = readBand(
    record.youngInexperiencedDrivers ?? record.young_inexperienced_drivers,
  );
  const partialTheft = readBand(record.partialTheft ?? record.partial_theft);
  const theftWithAntiTheft = readBand(
    record.theftWithAntiTheft ?? record.theft_with_anti_theft,
  );
  const theftWithoutAntiTheft = readBand(
    record.theftWithoutAntiTheft ?? record.theft_without_anti_theft,
  );

  if (
    !ownDamage &&
    !thirdPartyDamage &&
    !youngDrivers &&
    !partialTheft &&
    !theftWithAntiTheft &&
    !theftWithoutAntiTheft
  ) {
    return [];
  }

  const displayCurrency = currency.trim().toUpperCase() || 'ZMW';
  const lines: PolicyExcessDisplayLine[] = [];

  if (thirdPartyDamage?.included) {
    lines.push({
      label: 'Third Party Damage',
      text: `${thirdPartyDamage.percentage}% of each and every loss subject to a minimum amount of ${formatExcessMoney(displayCurrency, thirdPartyDamage.minimumAmount)}.`,
    });
  }

  if (youngDrivers?.included) {
    lines.push({
      label: 'Young and Inexperienced Drivers',
      text: `${youngDrivers.percentage}% of each and every loss subject to a minimum amount of ${formatExcessMoney(displayCurrency, youngDrivers.minimumAmount)}.`,
    });
  }

  if (ownDamage?.included) {
    lines.push({
      label: 'Own Damage',
      text: `${ownDamage.percentage}% of each and every loss subject to a minimum amount of ${formatExcessMoney(displayCurrency, ownDamage.minimumAmount)}.`,
    });
  }

  if (partialTheft?.included) {
    lines.push({
      label: 'Partial Theft',
      text: `${partialTheft.percentage}% of each and every loss subject to a minimum amount of ${formatExcessMoney(displayCurrency, partialTheft.minimumAmount)}.`,
    });
  }

  const withIncluded = theftWithAntiTheft?.included === true;
  const withoutIncluded = theftWithoutAntiTheft?.included === true;
  if (withIncluded && withoutIncluded && theftWithAntiTheft && theftWithoutAntiTheft) {
    lines.push({
      label: 'Theft',
      text: `${theftWithAntiTheft.percentage}% of the sum insured subject to a minimum of ${formatExcessMoney(displayCurrency, theftWithAntiTheft.minimumAmount)} with anti-theft device, or ${theftWithoutAntiTheft.percentage}% of the sum insured subject to a minimum of ${formatExcessMoney(displayCurrency, theftWithoutAntiTheft.minimumAmount)} without anti-theft device.`,
    });
  } else if (withIncluded && theftWithAntiTheft) {
    lines.push({
      label: 'Theft',
      text: `${theftWithAntiTheft.percentage}% of the sum insured subject to a minimum of ${formatExcessMoney(displayCurrency, theftWithAntiTheft.minimumAmount)} with anti-theft device.`,
    });
  } else if (withoutIncluded && theftWithoutAntiTheft) {
    lines.push({
      label: 'Theft',
      text: `${theftWithoutAntiTheft.percentage}% of the sum insured subject to a minimum of ${formatExcessMoney(displayCurrency, theftWithoutAntiTheft.minimumAmount)} without anti-theft device.`,
    });
  }

  if (
    record.antiTheftCertificateRequired === true ||
    record.anti_theft_certificate_required === true
  ) {
    lines.push({
      label: '',
      text: 'Full copy of the anti-theft device fitment certificate must be provided where applicable.',
    });
  }

  return lines;
}
