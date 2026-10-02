/**
 * RTSA anniversary-quarter cover period calculation (date-only).
 *
 * Derives Q1–Q5 policy end dates from the vehicle's first registration date,
 * using recurring quarterly anniversary boundaries. Each quarter ends one
 * calendar day before the next anniversary boundary. Q5 is the next
 * anniversary quarter end after Q4.
 *
 * All arithmetic is date-only (YYYY-MM-DD). Do not convert through UTC Date
 * timestamps — that can shift the calendar day.
 */

export type RtsaAnniversaryQuarterKey =
  | 'QUARTER1'
  | 'QUARTER2'
  | 'QUARTER3'
  | 'QUARTER4'
  | 'QUARTER5';

export type RtsaAnniversaryQuarterOption = {
  key: RtsaAnniversaryQuarterKey;
  quarterNumber: 1 | 2 | 3 | 4 | 5;
  startDate: string;
  endDate: string;
  alignsWithCurrentRtsaExpiry: boolean;
};

export type RtsaAnniversaryQuarterOptions = {
  startDate: string;
  firstRegistrationDate: string;
  currentLicenseExpiryDate: string | null;
  quarters: RtsaAnniversaryQuarterOption[];
  defaultQuarter: RtsaAnniversaryQuarterKey;
  defaultEndDate: string;
};

type DateParts = {
  year: number;
  month: number; // 1-12
  day: number;
};

const QUARTER_KEYS: RtsaAnniversaryQuarterKey[] = [
  'QUARTER1',
  'QUARTER2',
  'QUARTER3',
  'QUARTER4',
  'QUARTER5',
];

const DEFAULT_QUARTER_INDEX = 3; // Q4

export function parseDateOnly(value: string | null | undefined): DateParts | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().includes('T')
    ? value.trim().slice(0, 10)
    : value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null;
  }

  return { year, month, day };
}

export function formatDateOnly(parts: DateParts): string {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function compareDateOnly(a: DateParts, b: DateParts): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  return a.day - b.day;
}

export function addDaysDateOnly(parts: DateParts, days: number): DateParts {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days);
  const date = new Date(utc);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function anniversaryMonths(firstRegMonth: number): number[] {
  return [0, 3, 6, 9].map((offset) => ((firstRegMonth - 1 + offset) % 12) + 1);
}

function anniversaryBoundary(
  year: number,
  month: number,
  anniversaryDay: number,
): DateParts {
  return {
    year,
    month,
    day: clampDay(year, month, anniversaryDay),
  };
}

function quarterEndFromBoundary(boundary: DateParts): DateParts {
  return addDaysDateOnly(boundary, -1);
}

/**
 * Collect anniversary quarter-end dates around the policy start year.
 */
function collectQuarterEndsAround(
  start: DateParts,
  firstReg: DateParts,
): DateParts[] {
  const months = anniversaryMonths(firstReg.month);
  const ends: DateParts[] = [];

  for (let year = start.year - 1; year <= start.year + 3; year += 1) {
    for (const month of months) {
      const boundary = anniversaryBoundary(year, month, firstReg.day);
      ends.push(quarterEndFromBoundary(boundary));
    }
  }

  ends.sort(compareDateOnly);
  return ends;
}

function rollForwardAnnualExpiry(
  expired: DateParts,
  start: DateParts,
): DateParts {
  let candidate = { ...expired };
  while (compareDateOnly(candidate, start) < 0) {
    candidate = {
      year: candidate.year + 1,
      month: candidate.month,
      day: clampDay(candidate.year + 1, candidate.month, expired.day),
    };
  }
  return candidate;
}

export function calculateRtsaAnniversaryQuarterOptions(input: {
  firstRegistrationDate: string;
  policyStartDate: string;
  currentLicenseExpiryDate?: string | null;
}): RtsaAnniversaryQuarterOptions | null {
  const firstReg = parseDateOnly(input.firstRegistrationDate);
  const start = parseDateOnly(input.policyStartDate);
  if (!firstReg || !start) {
    return null;
  }

  const allEnds = collectQuarterEndsAround(start, firstReg);
  const firstUpcomingIndex = allEnds.findIndex(
    (end) => compareDateOnly(end, start) >= 0,
  );
  if (firstUpcomingIndex < 0 || firstUpcomingIndex + 4 >= allEnds.length) {
    return null;
  }

  const quarterEnds = [
    allEnds[firstUpcomingIndex],
    allEnds[firstUpcomingIndex + 1],
    allEnds[firstUpcomingIndex + 2],
    allEnds[firstUpcomingIndex + 3],
    allEnds[firstUpcomingIndex + 4],
  ] as [DateParts, DateParts, DateParts, DateParts, DateParts];

  const currentExpiry = parseDateOnly(input.currentLicenseExpiryDate ?? null);
  const startDate = formatDateOnly(start);
  const endStrings = quarterEnds.map(formatDateOnly);

  let defaultIndex = DEFAULT_QUARTER_INDEX;
  if (currentExpiry) {
    if (compareDateOnly(currentExpiry, start) >= 0) {
      const matchIndex = quarterEnds.findIndex(
        (end) => compareDateOnly(end, currentExpiry) === 0,
      );
      if (matchIndex >= 0) {
        defaultIndex = matchIndex;
      } else {
        const nextOnOrAfter = quarterEnds.findIndex(
          (end) => compareDateOnly(end, currentExpiry) >= 0,
        );
        defaultIndex =
          nextOnOrAfter >= 0 ? nextOnOrAfter : DEFAULT_QUARTER_INDEX;
      }
    } else {
      const nextAnnual = rollForwardAnnualExpiry(currentExpiry, start);
      const matchIndex = quarterEnds.findIndex(
        (end) => compareDateOnly(end, nextAnnual) === 0,
      );
      defaultIndex = matchIndex >= 0 ? matchIndex : DEFAULT_QUARTER_INDEX;
    }
  }

  const quarters: RtsaAnniversaryQuarterOption[] = QUARTER_KEYS.map(
    (key, index) => {
      const endDate = endStrings[index]!;
      return {
        key,
        quarterNumber: (index + 1) as 1 | 2 | 3 | 4 | 5,
        startDate,
        endDate,
        alignsWithCurrentRtsaExpiry: Boolean(
          currentExpiry &&
            compareDateOnly(currentExpiry, start) >= 0 &&
            endDate === formatDateOnly(currentExpiry),
        ),
      };
    },
  );

  return {
    startDate,
    firstRegistrationDate: formatDateOnly(firstReg),
    currentLicenseExpiryDate: currentExpiry
      ? formatDateOnly(currentExpiry)
      : null,
    quarters,
    defaultQuarter: QUARTER_KEYS[defaultIndex]!,
    defaultEndDate: endStrings[defaultIndex]!,
  };
}

export function resolveAnniversaryAlignedEndDate(input: {
  firstRegistrationDate: string;
  policyStartDate: string;
  currentLicenseExpiryDate?: string | null;
  policyDuration?: string | null;
}): string | null {
  const options = calculateRtsaAnniversaryQuarterOptions(input);
  if (!options) {
    return null;
  }

  const normalized = (input.policyDuration ?? '')
    .trim()
    .toUpperCase()
    .replace(/^QUARTER_(\d)$/, 'QUARTER$1');

  const selected = options.quarters.find((quarter) => quarter.key === normalized);
  return selected?.endDate ?? options.defaultEndDate;
}

export function isValidAnniversaryAlignedEndDate(input: {
  firstRegistrationDate: string;
  policyStartDate: string;
  endDate: string;
  currentLicenseExpiryDate?: string | null;
}): boolean {
  const options = calculateRtsaAnniversaryQuarterOptions(input);
  if (!options) {
    return false;
  }

  return options.quarters.some((quarter) => quarter.endDate === input.endDate);
}
