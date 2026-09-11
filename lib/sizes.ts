/**
 * The size vocabulary, in one place.
 *
 * This file is three things at once, exactly as CLAUDE.md describes: the
 * options offered in the form's dropdowns, the values the database is willing
 * to accept, and the key for reading sizes off past paper requests. Changing a
 * list here means re-reading old requests, so treat it as settled.
 *
 * The governing rule: offer whatever appears on a US garment tag, not whatever
 * the closet happens to have in stock.
 */

export type ChartRow = {
  /** The value stored and printed -- what a requester reads off a tag. */
  size: string;
  /** Typical age, as displayed. Also parsed by the estimator's age matching. */
  age: string;
  /** Typical height, as displayed. */
  h: string;
  /** Typical weight (or an equivalent, for adult letter sizes), as displayed. */
  w: string;
  /** [min, max] height in inches the estimator matches against, or null. */
  hi: [number, number] | null;
  /** [min, max] weight in pounds the estimator matches against, or null. */
  wi: [number, number] | null;
};

function r(
  size: string,
  age: string,
  h: string,
  w: string,
  hi: [number, number] | null,
  wi: [number, number] | null,
): ChartRow {
  return { size, age, h, w, hi, wi };
}

// ---------------------------------------------------------------------------
// Charts. Height in inches, weight in pounds, both typical rather than exact --
// every brand cuts differently. These are standard US sizing conventions, which
// is the right basis: the closet holds no height/weight data on the families it
// serves, so there is nothing to tailor them to.
// ---------------------------------------------------------------------------

export const BABY: ChartRow[] = [
  r('0-3M', '0-3 mo', '21-24"', '8-12 lb', [21, 24], [8, 12]),
  r('3-6M', '3-6 mo', '24-26"', '12-16 lb', [24, 26], [12, 16]),
  r('6-9M', '6-9 mo', '26-28"', '16-20 lb', [26, 28], [16, 20]),
  r('9-12M', '9-12 mo', '28-30"', '20-24 lb', [28, 30], [20, 24]),
  r('12-18M', '12-18 mo', '30-32"', '24-27 lb', [30, 32], [24, 27]),
  r('18-24M', '18-24 mo', '32-34"', '27-30 lb', [32, 34], [27, 30]),
];

export const TODDLER: ChartRow[] = [
  r('2T', '2 yr', '34-36"', '29-33 lb', [34, 36], [29, 33]),
  r('3T', '3 yr', '36-39"', '33-36 lb', [36, 39], [33, 36]),
  r('4T', '4 yr', '39-42"', '36-40 lb', [39, 42], [36, 40]),
];

// Girls' numeric stops at 16, and there is no 6X.
export const GIRLS: ChartRow[] = [
  r('4', '4 yr', '39-42"', '37-41 lb', [39, 42], [37, 41]),
  r('5', '5 yr', '42-45"', '41-45 lb', [42, 45], [41, 45]),
  r('6', '6 yr', '45-47"', '45-50 lb', [45, 47], [45, 50]),
  r('7', '7 yr', '49-51"', '54-58 lb', [49, 51], [54, 58]),
  r('8', '8 yr', '51-53"', '58-65 lb', [51, 53], [58, 65]),
  r('10', '9-10 yr', '53-55"', '65-75 lb', [53, 55], [65, 75]),
  r('12', '11-12 yr', '55-58"', '75-85 lb', [55, 58], [75, 85]),
  r('14', '13 yr', '58-61"', '85-95 lb', [58, 61], [85, 95]),
  r('16', '14-15 yr', '61-63"', '95-105 lb', [61, 63], [95, 105]),
];

// Boys' runs to 18.
export const BOYS: ChartRow[] = [
  r('4', '4 yr', '39-42"', '37-41 lb', [39, 42], [37, 41]),
  r('5', '5 yr', '42-45"', '41-45 lb', [42, 45], [41, 45]),
  r('6', '6 yr', '45-48"', '45-50 lb', [45, 48], [45, 50]),
  r('7', '7 yr', '48-50"', '50-55 lb', [48, 50], [50, 55]),
  r('8', '8 yr', '50-52"', '55-62 lb', [50, 52], [55, 62]),
  r('10', '9-10 yr', '52-55"', '62-72 lb', [52, 55], [62, 72]),
  r('12', '11-12 yr', '55-58"', '72-85 lb', [55, 58], [72, 85]),
  r('14', '13 yr', '58-61"', '85-100 lb', [58, 61], [85, 100]),
  r('16', '14-15 yr', '61-65"', '100-115 lb', [61, 65], [100, 115]),
  r('18', '16+ yr', '65-68"', '115-130 lb', [65, 68], [115, 130]),
];

export const WOMENS_TOP: ChartRow[] = [
  r('XS', '', '', 'Dress 0-2', null, null),
  r('S', '', '', 'Dress 4-6', null, null),
  r('M', '', '', 'Dress 8-10', null, null),
  r('L', '', '', 'Dress 12-14', null, null),
  r('XL', '', '', 'Dress 16-18', null, null),
  r('2XL', '', '', 'Dress 20-22', null, null),
  r('3XL', '', '', 'Dress 24-26', null, null),
];

// No XS in men's -- that is not a size that arrives on a men's tag here.
export const MENS_TOP: ChartRow[] = [
  r('S', '', '', 'Chest 34-36"', null, null),
  r('M', '', '', 'Chest 38-40"', null, null),
  r('L', '', '', 'Chest 42-44"', null, null),
  r('XL', '', '', 'Chest 46-48"', null, null),
  r('2XL', '', '', 'Chest 50-52"', null, null),
  r('3XL', '', '', 'Chest 54-56"', null, null),
];

export const WOMENS_PANT: ChartRow[] = [
  r('0', '', '', 'Waist 24"', null, null),
  r('2', '', '', 'Waist 25"', null, null),
  r('4', '', '', 'Waist 26"', null, null),
  r('6', '', '', 'Waist 27"', null, null),
  r('8', '', '', 'Waist 28"', null, null),
  r('10', '', '', 'Waist 29"', null, null),
  r('12', '', '', 'Waist 31"', null, null),
  r('14', '', '', 'Waist 33"', null, null),
  r('16', '', '', 'Waist 35"', null, null),
  r('18', '', '', 'Waist 37"', null, null),
  r('20', '', '', 'Waist 39"', null, null),
];

// Juniors is a separate cut, not the sizes between the even ones: a juniors 7
// is not between a women's 6 and 8. The form labels it so that someone reading
// an odd number off a tag lands in the right list.
export const JUNIORS_PANT: ChartRow[] = [
  r('1', '', '', 'Waist 24"', null, null),
  r('3', '', '', 'Waist 25"', null, null),
  r('5', '', '', 'Waist 26"', null, null),
  r('7', '', '', 'Waist 27"', null, null),
  r('9', '', '', 'Waist 28"', null, null),
  r('11', '', '', 'Waist 30"', null, null),
  r('13', '', '', 'Waist 32"', null, null),
  r('15', '', '', 'Waist 34"', null, null),
];

// No adult sizes -- diapers are opt-in on the form for exactly that reason.
export const DIAPERS: ChartRow[] = [
  r('Newborn', 'up to 1 mo', '', 'Up to 10 lb', null, [0, 10]),
  r('Size 1', '0-3 mo', '', '8-14 lb', null, [8, 14]),
  r('Size 2', '3-6 mo', '', '12-18 lb', null, [12, 18]),
  r('Size 3', '5-12 mo', '', '16-28 lb', null, [16, 28]),
  r('Size 4', '1-2 yr', '', '22-37 lb', null, [22, 37]),
  r('Size 5', '2-3 yr', '', '27-40 lb', null, [27, 40]),
  r('Size 6', '3-4 yr', '', '35-50 lb', null, [35, 50]),
  r('Size 7', '4-5 yr', '', '41-46 lb', null, [41, 46]),
  r('Size 8', '5+ yr', '', '46+ lb', null, [46, 80]),
  r('Pull-Ups 2T-3T', '2-3 yr', '', '18-34 lb', null, [18, 34]),
  r('Pull-Ups 3T-4T', '3-4 yr', '', '32-40 lb', null, [32, 40]),
  r('Pull-Ups 4T-5T', '4-5 yr', '', '38-50 lb', null, [38, 50]),
];

// Shoes: whole AND half sizes on every scale. Keep the half character as an
// escape -- a literal one in a bundled script arrived as mojibake twice.
function shoeScale(from: number, to: number, suffix: string): string[] {
  const out: string[] = [];
  for (let i = from; i <= to; i++) {
    out.push(i + suffix);
    if (i < to) out.push(i + '½' + suffix);
  }
  return out;
}

export const SHOE_C = shoeScale(1, 13, 'C');
export const SHOE_Y = shoeScale(1, 7, 'Y');
export const SHOE_W = shoeScale(5, 12, '');
export const SHOE_M = shoeScale(6, 15, '');

// Chart rows for shoes (whole sizes only -- the halves sit between them).
export const SHOE_C_CHART: ChartRow[] = [
  r('1C', '0-3 mo', 'Foot 3.6"', '', null, null),
  r('2C', '3-6 mo', 'Foot 3.9"', '', null, null),
  r('3C', '6-9 mo', 'Foot 4.1"', '', null, null),
  r('4C', '9-12 mo', 'Foot 4.4"', '', null, null),
  r('5C', '12-18 mo', 'Foot 4.7"', '', null, null),
  r('6C', '18-24 mo', 'Foot 5.0"', '', null, null),
  r('7C', '2 yr', 'Foot 5.2"', '', null, null),
  r('8C', '2-3 yr', 'Foot 5.5"', '', null, null),
  r('9C', '3 yr', 'Foot 5.8"', '', null, null),
  r('10C', '3-4 yr', 'Foot 6.1"', '', null, null),
  r('11C', '4-5 yr', 'Foot 6.4"', '', null, null),
  r('12C', '5-6 yr', 'Foot 6.7"', '', null, null),
  r('13C', '6-7 yr', 'Foot 7.0"', '', null, null),
];

export const SHOE_Y_CHART: ChartRow[] = [
  r('1Y', '7 yr', 'Foot 7.2"', '', null, null),
  r('2Y', '8 yr', 'Foot 7.5"', '', null, null),
  r('3Y', '9 yr', 'Foot 7.8"', '', null, null),
  r('4Y', '10 yr', 'Foot 8.1"', '', null, null),
  r('5Y', '11 yr', 'Foot 8.4"', '', null, null),
  r('6Y', '12 yr', 'Foot 8.6"', '', null, null),
  r('7Y', '13-14 yr', 'Foot 8.9"', '', null, null),
];

export const SHOE_W_CHART: ChartRow[] = [
  r('5', '', 'Foot 8.5"', '', null, null),
  r('6', '', 'Foot 8.9"', '', null, null),
  r('7', '', 'Foot 9.3"', '', null, null),
  r('8', '', 'Foot 9.5"', '', null, null),
  r('9', '', 'Foot 9.9"', '', null, null),
  r('10', '', 'Foot 10.2"', '', null, null),
  r('11', '', 'Foot 10.5"', '', null, null),
  r('12', '', 'Foot 10.9"', '', null, null),
];

export const SHOE_M_CHART: ChartRow[] = [
  r('6', '', 'Foot 9.3"', '', null, null),
  r('7', '', 'Foot 9.6"', '', null, null),
  r('8', '', 'Foot 9.9"', '', null, null),
  r('9', '', 'Foot 10.2"', '', null, null),
  r('10', '', 'Foot 10.6"', '', null, null),
  r('11', '', 'Foot 10.9"', '', null, null),
  r('12', '', 'Foot 11.2"', '', null, null),
  r('13', '', 'Foot 11.6"', '', null, null),
  r('14', '', 'Foot 11.9"', '', null, null),
  r('15', '', 'Foot 12.2"', '', null, null),
];

// Men's pants are the one size that needs two values: waist x inseam, odd
// waists included.
export const MENS_WAIST = ['28','29','30','31','32','33','34','36','38','40','42','44'] as const;
export const MENS_INSEAM = ['28','29','30','31','32','34'] as const;

// "Not needed" is a real recorded value, distinct from a blank. A blank means
// nobody answered; this means someone decided.
export const NOT_NEEDED = 'none';

export const GENDERS = ['female', 'male'] as const;
export type Gender = (typeof GENDERS)[number];

export const AGE_UNITS = ['years', 'months'] as const;
export type AgeUnit = (typeof AGE_UNITS)[number];

/** Group labels that mean "this is an adult size", for the under-13 note. */
export const ADULT_GROUPS = ["Women's", "Men's", 'Juniors (teen girls, odd sizes)', "Men's waist"];

export type SizeGroup = { label: string; opts: string[] };

const names = (rows: ChartRow[]) => rows.map((x) => x.size);

/** Gender narrows the lists; age never hides an option. */
export function shirtGroups(gender: string): SizeGroup[] {
  const g: SizeGroup[] = [
    { label: 'Baby', opts: names(BABY) },
    { label: 'Toddler', opts: names(TODDLER) },
  ];
  if (gender === 'male') {
    g.push({ label: "Boys'", opts: names(BOYS) }, { label: "Men's", opts: names(MENS_TOP) });
  } else if (gender === 'female') {
    g.push({ label: "Girls'", opts: names(GIRLS) }, { label: "Women's", opts: names(WOMENS_TOP) });
  } else {
    g.push(
      { label: "Girls'", opts: names(GIRLS) },
      { label: "Boys'", opts: names(BOYS) },
      { label: "Women's", opts: names(WOMENS_TOP) },
      { label: "Men's", opts: names(MENS_TOP) },
    );
  }
  return g;
}

export function pantGroups(gender: string): SizeGroup[] {
  const g: SizeGroup[] = [
    { label: 'Baby', opts: names(BABY) },
    { label: 'Toddler', opts: names(TODDLER) },
  ];
  const waist = MENS_WAIST.map((w) => w + '" waist');
  if (gender === 'male') {
    g.push({ label: "Boys'", opts: names(BOYS) }, { label: "Men's waist", opts: waist });
  } else if (gender === 'female') {
    g.push(
      { label: "Girls'", opts: names(GIRLS) },
      { label: "Women's", opts: names(WOMENS_PANT) },
      { label: 'Juniors (teen girls, odd sizes)', opts: names(JUNIORS_PANT) },
    );
  } else {
    g.push(
      { label: "Girls'", opts: names(GIRLS) },
      { label: "Boys'", opts: names(BOYS) },
      { label: "Women's", opts: names(WOMENS_PANT) },
      { label: 'Juniors (teen girls, odd sizes)', opts: names(JUNIORS_PANT) },
      { label: "Men's waist", opts: waist },
    );
  }
  return g;
}

export function shoeGroups(gender: string): SizeGroup[] {
  const g: SizeGroup[] = [
    { label: "Kids' (C sizes)", opts: SHOE_C },
    { label: 'Youth (Y sizes)', opts: SHOE_Y },
  ];
  if (gender === 'male') g.push({ label: "Men's", opts: SHOE_M });
  else if (gender === 'female') g.push({ label: "Women's", opts: SHOE_W });
  else g.push({ label: "Women's", opts: SHOE_W }, { label: "Men's", opts: SHOE_M });
  return g;
}

export const DIAPER_SIZES = names(DIAPERS);

export type SizeField = 'shirt' | 'pant' | 'shoe' | 'diaper';

export type ChartSection = { cap: string; rows: ChartRow[]; cols: string[] };

/** The charts behind a "Sizing help" button, for one field and gender. */
export function chartsFor(field: SizeField, gender: string): ChartSection[] {
  const out: ChartSection[] = [];
  if (field === 'diaper') {
    return [{ cap: 'Diapers and pull-ups', rows: DIAPERS, cols: ['Size', 'Typical age', '', 'Weight'] }];
  }
  if (field === 'shoe') {
    out.push({ cap: "Kids' (C sizes)", rows: SHOE_C_CHART, cols: ['Size', 'Typical age', 'Foot length'] });
    out.push({ cap: 'Youth (Y sizes)', rows: SHOE_Y_CHART, cols: ['Size', 'Typical age', 'Foot length'] });
    if (gender !== 'male') out.push({ cap: "Women's", rows: SHOE_W_CHART, cols: ['Size', '', 'Foot length'] });
    if (gender !== 'female') out.push({ cap: "Men's", rows: SHOE_M_CHART, cols: ['Size', '', 'Foot length'] });
    return out;
  }
  out.push({ cap: 'Baby', rows: BABY, cols: ['Size', 'Typical age', 'Height', 'Weight'] });
  out.push({ cap: 'Toddler', rows: TODDLER, cols: ['Size', 'Typical age', 'Height', 'Weight'] });
  if (gender !== 'male') out.push({ cap: "Girls'", rows: GIRLS, cols: ['Size', 'Typical age', 'Height', 'Weight'] });
  if (gender !== 'female') out.push({ cap: "Boys'", rows: BOYS, cols: ['Size', 'Typical age', 'Height', 'Weight'] });
  if (field === 'shirt') {
    if (gender !== 'male') out.push({ cap: "Women's", rows: WOMENS_TOP, cols: ['Size', '', '', 'Equivalent'] });
    if (gender !== 'female') out.push({ cap: "Men's", rows: MENS_TOP, cols: ['Size', '', '', 'Equivalent'] });
  } else if (gender !== 'male') {
    out.push({ cap: "Women's", rows: WOMENS_PANT, cols: ['Size', '', '', 'Waist'] });
    out.push({ cap: 'Juniors (teen girls, odd sizes)', rows: JUNIORS_PANT, cols: ['Size', '', '', 'Waist'] });
  }
  return out;
}

/** Every value any shirt dropdown offers, for server-side validation. */
export function allShirtValues(): Set<string> {
  const s = new Set<string>([NOT_NEEDED]);
  shirtGroups('').forEach((g) => g.opts.forEach((o) => s.add(o)));
  return s;
}

export function allPantValues(): Set<string> {
  const s = new Set<string>([NOT_NEEDED]);
  pantGroups('').forEach((g) => g.opts.forEach((o) => s.add(o)));
  return s;
}

export function allShoeValues(): Set<string> {
  const s = new Set<string>([NOT_NEEDED]);
  shoeGroups('').forEach((g) => g.opts.forEach((o) => s.add(o)));
  return s;
}
