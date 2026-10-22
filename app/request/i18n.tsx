/**
 * The request form's words, in English and Spanish.
 *
 * Only what is displayed is translated. Every stored value stays as it is in
 * lib/sizes.ts -- group labels like "Girls'" travel inside option values and
 * are what the server checks and the queue prints -- so a Spanish request is
 * indistinguishable from an English one once it is saved. Size codes on
 * garment tags (XS, 2T, 4C, 1Y) are never translated.
 */

export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}

const en = {
  docTitle: 'Clothing Request Form · Clarksburg Closet',
  switchTo: 'Español',
  switchLang: 'es' as Lang,
  switchAria: 'Ver este formulario en español',
  title: 'Clothing Request Form',
  lede: (
    <>
      One request can cover up to 10 people, whether you&rsquo;re requesting for your own household
      or on someone else&rsquo;s behalf. Each household may request once per season. Every size has
      a <em>Sizing help</em> button with charts by age, height and weight — please use it rather
      than guessing, since we can&rsquo;t guess sizes for you.
    </>
  ),

  whoHeading: 'Who is making this request',
  date: 'Date of request',
  yourName: 'Your name',
  namePlaceholder: 'First and last name',
  phone: 'Cell phone number',
  email: 'Email address',
  emailPlaceholder: 'you@example.org',
  emailHint: 'We send your confirmation here.',
  agency: 'Organization or agency',
  agencyPlaceholder: 'Start typing…',
  agencyHint: 'Leave blank if you are requesting for yourself or your own household.',

  recipient: 'Recipient',
  remove: 'Remove',
  name: 'Name',
  gender: 'Gender',
  select: 'Select…',
  female: 'Female',
  male: 'Male',
  age: 'Age',
  ageUnit: 'Age unit',
  yearsOld: 'years old',
  monthsOld: 'months old',
  ageHint: 'Fill this in first — it drives the sizing help.',
  shirt: 'Shirt size',
  shirtPlaceholder: 'Select a shirt size…',
  pant: 'Pant size',
  pantPlaceholder: 'Select a pant size…',
  inseam: 'Pant inseam',
  inseamHint: 'Men’s pants are sized waist × inseam.',
  shoe: 'Shoe size',
  shoePlaceholder: 'Choose one or more sizes…',
  shoeHint: 'Tick every size that would fit — for example 5 and 5½.',
  sizingHelp: 'ⓘ Sizing help',
  notNeeded: 'Not needed',
  needsDiaper: 'Also needs diapers or pull-ups',
  diaper: 'Diaper size',
  diaperPlaceholder: 'Select a diaper size…',
  items: 'Items needed most / additional info',
  itemsPlaceholder: 'Winter coat, school shoes, anything else we should know…',
  adultNote: (years: number) =>
    `That’s an adult size for a ${years}-year-old. If it’s right, leave it — knowing helps us pick the right style.`,

  addRecipient: '+ Add another recipient',
  countOf: (n: number, max: number) => `${n} of ${max} recipients on this request`,

  prayerHeading: 'Prayer request',
  prayerLabel: 'Anything you’d like us to pray for',
  optional: 'Optional',

  stillNeeded: 'Still needed before this can be sent',
  couldNotSend: 'Could not send',
  sending: 'Sending…',
  submit: 'Submit request',
  submitHint: (
    <>
      Every size must be chosen, or marked <em>Not needed</em>.
    </>
  ),

  missingName: 'Requester: your name',
  missingPhone: 'Requester: your phone number',
  missingEmail: 'Requester: your email address',
  missing: {
    name: 'name',
    gender: 'gender',
    age: 'age',
    shirt: 'shirt size',
    pant: 'pant size',
    inseam: 'pant inseam',
    shoe: 'shoe size',
    diaper: 'diaper size',
  },
  recipientMissing: (n: number, who: string, list: string[]) =>
    `Recipient ${n}${who ? ` (${who})` : ''}: ${list.join(', ')}`,
  networkError: 'Something went wrong sending the request. Please try again.',
  /** Null keeps the server's own (English) message. */
  serverError: null as Record<'invalid' | 'save', string> | null,

  doneEyebrow: 'Request received',
  doneTitle: 'Thank you',
  doneHeading: 'Your request is with us',
  doneNumber: (number: string, count: number) => (
    <>
      It is request <strong>#{number}</strong> for {count} {count === 1 ? 'person' : 'people'}.
      Please keep that number — it is how we find your request if you call.
    </>
  ),
  doneContact: (email: string, phone: string) =>
    `A volunteer will go through it and contact you at ${email} or ${phone}. There is no fixed turnaround: we work the queue as clothing comes in.`,
  another: 'Submit another request',

  help: {
    field: { shirt: 'shirt', pant: 'pant', shoe: 'shoe', diaper: 'diaper' },
    title: (field: string) => `Typical ${field} sizes`,
    close: 'Close',
    find: 'Find a size',
    height: 'Height (in)',
    weight: 'Weight (lb)',
    eg: 'e.g.',
    closest: (field: string) => `Closest ${field} size: `,
    or: ' or ',
    noMatch:
      'No typical size matches those numbers exactly — scan the charts below for the closest row.',
    ageRows: (years: number) =>
      `Rows matching age ${years} are highlighted below. Add height or weight to narrow it down.`,
    prompt:
      'Enter a height or weight, or fill in the age on the form, and we’ll highlight the closest sizes.',
    caveat:
      'These are typical sizes and vary by brand. If you can read the tag in something that already fits, use that instead.',
    use: 'Use this',
  },
};

export type Strings = typeof en;

const es: Strings = {
  docTitle: 'Formulario de solicitud de ropa · Clarksburg Closet',
  switchTo: 'English',
  switchLang: 'en',
  switchAria: 'View this form in English',
  title: 'Formulario de solicitud de ropa',
  lede: (
    <>
      Una solicitud puede incluir hasta 10 personas, ya sea para su propio hogar o en nombre de otra
      persona. Cada hogar puede hacer una solicitud por temporada. Cada talla tiene un botón de{' '}
      <em>Ayuda con tallas</em> con tablas por edad, estatura y peso. Por favor, úselo en lugar de
      adivinar, porque nosotros no podemos adivinar las tallas por usted.
    </>
  ),

  whoHeading: 'Quién hace esta solicitud',
  date: 'Fecha de la solicitud',
  yourName: 'Su nombre',
  namePlaceholder: 'Nombre y apellido',
  phone: 'Número de celular',
  email: 'Correo electrónico',
  emailPlaceholder: 'nombre@ejemplo.org',
  emailHint: 'Le enviaremos la confirmación a este correo.',
  agency: 'Organización o agencia',
  agencyPlaceholder: 'Empiece a escribir…',
  agencyHint: 'Déjelo en blanco si la solicitud es para usted o para su propio hogar.',

  recipient: 'Persona',
  remove: 'Quitar',
  name: 'Nombre',
  gender: 'Sexo',
  select: 'Seleccione…',
  female: 'Femenino',
  male: 'Masculino',
  age: 'Edad',
  ageUnit: 'Unidad de edad',
  yearsOld: 'años',
  monthsOld: 'meses',
  ageHint: 'Llene esto primero: la ayuda con tallas depende de la edad.',
  shirt: 'Talla de camisa',
  shirtPlaceholder: 'Seleccione una talla de camisa…',
  pant: 'Talla de pantalón',
  pantPlaceholder: 'Seleccione una talla de pantalón…',
  inseam: 'Largo de entrepierna',
  inseamHint: 'Los pantalones de hombre se miden por cintura × entrepierna.',
  shoe: 'Talla de zapato',
  shoePlaceholder: 'Elija una o más tallas…',
  shoeHint: 'Marque todas las tallas que le quedarían, por ejemplo 5 y 5½.',
  sizingHelp: 'ⓘ Ayuda con tallas',
  notNeeded: 'No se necesita',
  needsDiaper: 'También necesita pañales o pull-ups',
  diaper: 'Talla de pañal',
  diaperPlaceholder: 'Seleccione una talla de pañal…',
  items: 'Artículos que más necesita / información adicional',
  itemsPlaceholder:
    'Abrigo de invierno, zapatos para la escuela, cualquier otra cosa que debamos saber…',
  adultNote: (years: number) =>
    `Esa es una talla de adulto para alguien de ${years} años. Si es correcta, déjela: saberlo nos ayuda a escoger el estilo adecuado.`,

  addRecipient: '+ Agregar otra persona',
  countOf: (n: number, max: number) => `${n} de ${max} personas en esta solicitud`,

  prayerHeading: 'Petición de oración',
  prayerLabel: '¿Hay algo por lo que quiera que oremos?',
  optional: 'Opcional',

  stillNeeded: 'Falta completar antes de enviar',
  couldNotSend: 'No se pudo enviar',
  sending: 'Enviando…',
  submit: 'Enviar solicitud',
  submitHint: (
    <>
      Cada talla debe elegirse o marcarse como <em>No se necesita</em>.
    </>
  ),

  missingName: 'Solicitante: su nombre',
  missingPhone: 'Solicitante: su número de teléfono',
  missingEmail: 'Solicitante: su correo electrónico',
  missing: {
    name: 'nombre',
    gender: 'sexo',
    age: 'edad',
    shirt: 'talla de camisa',
    pant: 'talla de pantalón',
    inseam: 'largo de entrepierna',
    shoe: 'talla de zapato',
    diaper: 'talla de pañal',
  },
  recipientMissing: (n: number, who: string, list: string[]) =>
    `Persona ${n}${who ? ` (${who})` : ''}: ${list.join(', ')}`,
  networkError: 'Algo salió mal al enviar la solicitud. Por favor, inténtelo de nuevo.',
  serverError: {
    invalid: 'Algunas respuestas no fueron aceptadas. Revise las tallas e inténtelo de nuevo.',
    save: 'No se pudo guardar la solicitud. Inténtelo de nuevo o llame a Clarksburg Closet.',
  },

  doneEyebrow: 'Solicitud recibida',
  doneTitle: 'Gracias',
  doneHeading: 'Recibimos su solicitud',
  doneNumber: (number: string, count: number) => (
    <>
      Es la solicitud <strong>#{number}</strong> para {count} {count === 1 ? 'persona' : 'personas'}.
      Por favor, guarde ese número: así encontramos su solicitud si nos llama.
    </>
  ),
  doneContact: (email: string, phone: string) =>
    `Un voluntario la revisará y se comunicará con usted al ${email} o al ${phone}. No hay un plazo fijo: atendemos las solicitudes a medida que llega la ropa.`,
  another: 'Enviar otra solicitud',

  help: {
    field: { shirt: 'camisa', pant: 'pantalón', shoe: 'zapato', diaper: 'pañal' },
    title: (field: string) => `Tallas típicas de ${field}`,
    close: 'Cerrar',
    find: 'Buscar una talla',
    height: 'Estatura (pulg.)',
    weight: 'Peso (libras)',
    eg: 'ej.',
    closest: (field: string) => `Talla de ${field} más cercana: `,
    or: ' o ',
    noMatch:
      'Ninguna talla típica coincide exactamente con esos números. Busque la fila más cercana en las tablas de abajo.',
    ageRows: (years: number) =>
      `Las filas para la edad ${years} están resaltadas abajo. Agregue la estatura o el peso para precisar.`,
    prompt:
      'Escriba una estatura o un peso, o llene la edad en el formulario, y resaltaremos las tallas más cercanas.',
    caveat:
      'Estas son tallas típicas y varían según la marca. Si puede leer la etiqueta de algo que ya le queda bien, use esa talla.',
    use: 'Usar esta',
  },
};

export const STRINGS: Record<Lang, Strings> = { en, es };

// ---------------------------------------------------------------------------
// Display-only translations of the size vocabulary. The English text is the
// stored value; these only change what a Spanish reader sees.
// ---------------------------------------------------------------------------

const GROUP_ES: Record<string, string> = {
  Baby: 'Bebé',
  Toddler: 'Niños pequeños (T)',
  "Girls'": 'Niñas',
  "Boys'": 'Niños',
  "Women's": 'Mujer',
  "Men's": 'Hombre',
  'Juniors (teen girls, odd sizes)': 'Juniors (jóvenes, tallas impares)',
  "Men's waist": 'Hombre (cintura)',
  "Kids' (C sizes)": 'Niños pequeños (tallas C)',
  'Youth (Y sizes)': 'Juvenil (tallas Y)',
  'Diapers and pull-ups': 'Pañales y pull-ups',
};

/** A size group's label, for display. */
export function groupLabel(label: string, lang: Lang): string {
  return lang === 'es' ? (GROUP_ES[label] ?? label) : label;
}

/** A size option, for display. Tag codes pass through untouched. */
export function sizeLabel(size: string, lang: Lang): string {
  if (lang !== 'es') return size;
  return size
    .replace(/" waist$/, '" de cintura')
    .replace(/^Newborn$/, 'Recién nacido')
    .replace(/^Size (\d+)$/, 'Talla $1');
}

const COL_ES: Record<string, string> = {
  Size: 'Talla',
  'Typical age': 'Edad típica',
  Height: 'Estatura',
  Weight: 'Peso',
  Equivalent: 'Equivalencia',
  Waist: 'Cintura',
  'Foot length': 'Largo del pie',
};

export function columnLabel(col: string, lang: Lang): string {
  return lang === 'es' ? (COL_ES[col] ?? col) : col;
}

/**
 * A chart cell ("9-10 yr", "Waist 24\"", "Up to 10 lb"), for display. The
 * estimator still parses the English original.
 */
export function chartText(text: string, lang: Lang): string {
  if (lang !== 'es' || !text) return text;
  return text
    .replace(/^up to 1 mo$/, 'hasta 1 mes')
    .replace(/ mo$/, ' meses')
    .replace(/ yr$/, ' años')
    .replace(/^Up to /, 'Hasta ')
    .replace(/^Dress /, 'Vestido ')
    .replace(/^Chest /, 'Pecho ')
    .replace(/^Waist /, 'Cintura ')
    .replace(/^Foot /, 'Pie ');
}
