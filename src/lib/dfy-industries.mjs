// Industry versions of the done-for-you offer (/done-for-you/<slug>/).
// Copy only: prices, payment links and the guarantee come from offers.mjs.
import { DFY_PATH } from './offers.mjs';

export const DFY_CASE_STUDY_NOTE = "Founding clients can opt in to a short case study about their results. It's optional and never affects your price.";

export const DFY_QUESTIONS_LINE = 'replies within the hour during business hours (Pacific).';

export const DFY_INDUSTRIES = [
  {
    slug: 'dental',
    cardLine: 'New patients, insurance questions, recall and booking',
    name: 'Dental',
    audience: 'dental practices',
    icon: 'dental',
    accent: 'dental',
    industryPage: '/industries/dental/',
    title: 'Done-for-you AI receptionist setup for dental practices',
    headline: 'Every new-patient call answered, even when the front desk is busy.',
    lead: 'We pick, set up and tune an AI receptionist around your practice: new-patient calls, insurance questions, recall booking and after-hours care, handled warmly and the way your team would.',
    description: 'Done-for-you AI receptionist setup for dental practices: new-patient calls, insurance questions, recall and booking, HIPAA-aware handling. $1,500 one-time ($1,000 founding rate), with a defined result or a full refund of our fee.',
    benefits: [
      { h: 'New-patient calls, welcomed', p: 'First-time callers get a friendly answer, a few quick intake questions and an appointment or a callback, instead of a voicemail during the lunch rush.' },
      { h: 'Insurance questions, answered', p: 'Your accepted plans and payment options go into the script, so callers hear clear answers and anything plan-specific goes to your team with the details already taken.' },
      { h: 'Recall and booking', p: 'Cleanings and check-ups booked straight into your schedule where your practice software and the vendor support it, or sent to the front desk as a ready-to-confirm request.' },
      { h: 'HIPAA-aware handling', p: 'We shortlist vendors that publish a BAA, keep messages to what your team needs, and send clinical questions to a person.' },
    ],
    flows: [
      {
        title: 'New patient, after hours',
        steps: [
          'Caller: "Hi, I\'m looking for a new dentist. Are you taking new patients?"',
          'Receptionist welcomes them, confirms the practice is accepting new patients and asks a few intake questions: name, phone, reason for the visit, insurance.',
          'It offers the next open new-patient slots, or takes a callback request if online booking is not connected.',
          'The caller gets a confirmation by text, and your team gets a summary by email before the morning huddle.',
        ],
      },
      {
        title: 'Insurance question',
        steps: [
          'Caller: "Do you take Delta Dental?"',
          'Receptionist answers from the plan list you approved, and explains payment options if their plan is not listed.',
          'For coverage details it cannot confirm, it takes the member details and passes them to your team for a callback.',
        ],
      },
      {
        title: 'Toothache on a Saturday',
        steps: [
          'Caller describes pain and swelling.',
          'Receptionist follows your urgent-care rules: transfers to the on-call number, or shares your emergency instructions word for word.',
          'It never gives clinical advice, and the on-call dentist gets a summary right away.',
        ],
      },
    ],
    faqs: [
      { q: 'Will it work with our practice management software?', a: "We check this in the fit review. Where the vendor supports your system, appointments are booked straight into your schedule. Where it doesn't, the receptionist sends a ready-to-confirm request to your front desk, so nothing is lost." },
      { q: 'How do you handle HIPAA?', a: 'We shortlist vendors that publish a BAA and help you get it signed before go-live. We keep messages to what your team needs to call back, and clinical questions go to a person.' },
      { q: 'Does it replace our front desk?', a: 'No. It catches the calls your team cannot get to: lunch, busy mornings, after hours and overflow. Your front desk stays the heart of the practice.' },
      { q: 'What about dental emergencies?', a: 'You set the rules. Urgent calls can transfer to your on-call number or hear your emergency instructions, and the receptionist never gives clinical advice.' },
      { q: 'How long does setup take?', a: 'Go-live within 7 business days of receiving your intake and vendor account access, then 60 days of weekly tuning.' },
    ],
  },
  {
    slug: 'legal',
    cardLine: 'Intake screening, conflict-safe messages, urgent routing',
    name: 'Legal',
    audience: 'law firms',
    icon: 'legal',
    accent: 'legal',
    industryPage: '/industries/legal/',
    title: 'Done-for-you AI receptionist setup for law firms',
    headline: 'Every potential client heard, screened and routed, day or night.',
    lead: 'We pick, set up and tune an AI receptionist for your firm: intake screening, conflict-safe message taking, callers in more than one language and urgent matters routed to the right person.',
    description: 'Done-for-you AI receptionist setup for law firms: intake screening, conflict-safe message taking, multilingual callers and urgent-matter routing. $1,500 one-time ($1,000 founding rate), with a defined result or a full refund of our fee.',
    benefits: [
      { h: 'Intake screening', p: 'Callers are asked your intake questions in your order: practice area, location, timing. Your team gets a clean summary of every potential client.' },
      { h: 'Conflict-safe message taking', p: "The receptionist collects names and contact details for your conflict check and politely holds off on case details until your team has reviewed them." },
      { h: 'Multilingual callers', p: 'Where the vendor supports it, callers are greeted and screened in their own language, and your team gets the summary in English.' },
      { h: 'Urgent-matter routing', p: 'Arrests, court deadlines and other time-sensitive calls follow your rules: a warm transfer, an on-call attorney, or an immediate text to the right person.' },
    ],
    flows: [
      {
        title: 'New personal injury inquiry',
        steps: [
          'Caller: "I was in a car accident last week and need a lawyer."',
          'Receptionist thanks them, asks for name, phone, email and the names of anyone else involved for your conflict check.',
          'It asks your screening questions (date, location, injuries treated) without collecting a detailed account.',
          'It offers a consultation slot or a callback time, and your intake team gets the summary right away.',
        ],
      },
      {
        title: 'Urgent matter at night',
        steps: [
          'Caller: "My brother was just arrested."',
          'Receptionist recognizes the urgent matter from your rules and gathers the key details: who, where, and a callback number.',
          'It transfers to your on-call attorney or texts them the summary, and tells the caller exactly what happens next.',
        ],
      },
      {
        title: 'Spanish-speaking caller',
        steps: [
          'Caller begins in Spanish.',
          'Where the vendor supports it, the receptionist continues in Spanish and runs the same intake questions.',
          'Your team receives the summary in English, flagged with the caller\'s preferred language.',
        ],
      },
    ],
    faqs: [
      { q: 'Does it give legal advice?', a: 'No. It greets callers, runs your intake questions, takes messages and routes urgent matters. Every legal question goes to your team.' },
      { q: 'How do you keep message taking conflict-safe?', a: 'The script collects the names you need for a conflict check and contact details first, and politely holds off on case details until your team has reviewed them. You approve the wording before go-live.' },
      { q: 'Can it connect to our practice management software?', a: 'We check this in the fit review. Where the vendor integrates with your system, intake summaries can land there; otherwise they arrive by email or text in the format you choose.' },
      { q: 'What about callers who speak another language?', a: 'Many vendors support more than one language. If that matters to your firm, it becomes part of how we pick the vendor, and we test it before go-live.' },
      { q: 'How long does setup take?', a: 'Go-live within 7 business days of receiving your intake and vendor account access, then 60 days of weekly tuning.' },
    ],
  },
  {
    slug: 'home-services',
    cardLine: 'Emergency jobs, on-call dispatch, quote requests',
    name: 'Home services',
    audience: 'home service businesses',
    icon: 'plumbing',
    accent: 'plumbing',
    industryPage: '/industries/plumbing/',
    title: 'Done-for-you AI receptionist setup for home service businesses',
    headline: 'Every emergency job and quote request caught, even while you are on a job.',
    lead: 'We pick, set up and tune an AI receptionist for plumbers, HVAC, roofing and other home service pros: after-hours emergencies, on-call dispatch, quote requests and service-area questions.',
    description: 'Done-for-you AI receptionist setup for plumbing, HVAC, roofing and home service businesses: emergency and after-hours jobs, dispatch and on-call routing, quote requests and service-area questions. $1,500 one-time ($1,000 founding rate), with a defined result or a full refund of our fee.',
    benefits: [
      { h: 'Emergency and after-hours jobs', p: 'Burst pipes, no-heat calls and leaks get answered at any hour and handled by your rules, so urgent work reaches you instead of the next company on the list.' },
      { h: 'Dispatch and on-call routing', p: "Calls go to whoever is on call tonight, by transfer or text, with the address and the problem already written down." },
      { h: 'Quote requests', p: 'Callers describe the job, share photos by text where the vendor supports it, and pick a time for the estimate. You get a tidy lead, not a garbled voicemail.' },
      { h: 'Service-area questions', p: "The receptionist knows the towns and ZIP codes you cover, answers yes or no right away, and kindly points out-of-area callers elsewhere." },
    ],
    flows: [
      {
        title: 'Burst pipe at 2 AM',
        steps: [
          'Caller: "Water is pouring from under my sink!"',
          'Receptionist shares your safety tip (how to find the shut-off valve), then takes the address, the problem and a callback number.',
          'It confirms the address is in your service area and transfers to your on-call tech, or texts them the job right away.',
          'The caller hears what happens next, and the job is in your inbox for the morning.',
        ],
      },
      {
        title: 'Quote request during a job',
        steps: [
          'Caller: "I need a quote to replace my water heater."',
          'Receptionist asks a few questions you choose: type, size, age, and how soon they need it.',
          'It offers estimate windows from your calendar, or takes a preferred time for a callback.',
        ],
      },
      {
        title: 'Out-of-area caller',
        steps: [
          'Caller gives a ZIP code outside your area.',
          'Receptionist thanks them warmly, explains you do not cover that area yet, and ends the call politely, so your team never chases a job you cannot take.',
        ],
      },
    ],
    faqs: [
      { q: 'Will it work with ServiceTitan, Jobber or Housecall Pro?', a: 'We check this in the fit review. Where the vendor integrates with your software, jobs and bookings can flow straight in; otherwise they arrive by text or email in the format your dispatcher likes.' },
      { q: 'How does it decide what counts as an emergency?', a: 'You do. We write your emergency rules into the script (for example: active leaks, no heat in winter, gas smells), and test them with scripted calls before go-live.' },
      { q: 'Can it route to whoever is on call?', a: 'Yes, where the vendor supports it. Calls can transfer to a rotating on-call number, or the summary can be texted to the tech on call.' },
      { q: 'Does it give prices on the phone?', a: 'Only what you approve, such as a trip fee or a price range. Everything else becomes a quote request for your team.' },
      { q: 'How long does setup take?', a: 'Go-live within 7 business days of receiving your intake and vendor account access, then 60 days of weekly tuning.' },
    ],
  },
  {
    slug: 'med-spa',
    cardLine: 'Consult booking, treatment questions, deposits and policies',
    name: 'Med spa',
    audience: 'med spas',
    icon: 'med-spa',
    accent: 'med-spa',
    industryPage: null,
    title: 'Done-for-you AI receptionist setup for med spas',
    headline: 'Every consult request booked, even after the spa has closed for the night.',
    lead: 'We pick, set up and tune an AI receptionist for your med spa: consult booking, treatment questions answered without medical advice, deposits and policies explained, and evening inquiries captured.',
    description: 'Done-for-you AI receptionist setup for med spas: consult booking, treatment questions without medical advice, deposits and policies, and after-hours inquiries. $1,500 one-time ($1,000 founding rate), with a defined result or a full refund of our fee.',
    benefits: [
      { h: 'Consult booking', p: 'Callers book a consultation straight into your calendar where the vendor supports it, or leave a request your team can confirm in seconds.' },
      { h: 'Treatment questions, no medical advice', p: 'General questions about your services, timing and what to expect are answered from your approved menu. Anything clinical goes to your providers.' },
      { h: 'Deposits and policies', p: 'Your deposit, cancellation and late-arrival policies are explained clearly and kindly, the same way every time.' },
      { h: 'After-hours inquiries', p: 'Evenings and weekends are when many people finally call. Every inquiry is captured with name, number and interest, ready for your team in the morning.' },
    ],
    flows: [
      {
        title: 'Consult booking in the evening',
        steps: [
          'Caller: "I\'d like to book a consultation for laser hair removal."',
          'Receptionist welcomes them, asks name, phone, email and the treatment they are interested in.',
          'It offers open consultation times and explains your deposit policy before confirming.',
          'The caller gets a confirmation, and your team gets the booking and notes.',
        ],
      },
      {
        title: 'Treatment question',
        steps: [
          'Caller: "Are injectables safe for me? I\'m on medication."',
          'Receptionist shares general information you approved, explains that a provider will answer health questions at the consultation, and never gives medical advice.',
          'It offers to book that consultation or arrange a callback from your team.',
        ],
      },
      {
        title: 'Policy question',
        steps: [
          'Caller: "What happens if I need to reschedule?"',
          'Receptionist explains your cancellation and deposit policy word for word, and offers to move the appointment if they need to.',
        ],
      },
    ],
    faqs: [
      { q: 'Will it give medical advice?', a: 'No. It answers general questions from the treatment menu and wording you approve, and every health or suitability question goes to your providers.' },
      { q: 'Can it take deposits?', a: 'It explains your deposit policy on every booking. Whether it can collect a deposit during the call depends on the vendor and your booking system; we check that in the fit review.' },
      { q: 'Will it work with our booking software?', a: 'We check this in the fit review. Where the vendor integrates with your system, consultations are booked straight in; otherwise your team gets a ready-to-confirm request.' },
      { q: 'What about privacy?', a: 'We keep messages to what your team needs to follow up. If your spa handles protected health information by phone, we shortlist vendors that publish a BAA.' },
      { q: 'How long does setup take?', a: 'Go-live within 7 business days of receiving your intake and vendor account access, then 60 days of weekly tuning.' },
    ],
  },
];

export const DFY_INDUSTRY_SLUGS = DFY_INDUSTRIES.map((item) => item.slug);

export function dfyIndustry(slug) {
  return DFY_INDUSTRIES.find((item) => item.slug === slug) || null;
}

export function dfyIndustryPath(slug) {
  return `${DFY_PATH}${slug}/`;
}

// /industries/<key>/ page -> matching done-for-you industry page, or null.
// plumbing maps to home services; medical has no industry version.
const FROM_INDUSTRY_PAGE = { dental: 'dental', legal: 'legal', plumbing: 'home-services' };
export function dfyForIndustryPage(key) {
  const slug = FROM_INDUSTRY_PAGE[key];
  return slug ? dfyIndustry(slug) : null;
}

// One short, shared description of what every industry version includes.
export const DFY_INCLUDED = [
  { h: 'Fit review', p: 'A short intake plus your call log, so we know your volume, hours and what callers ask for.' },
  { h: 'Pick', p: 'One recommended vendor from our verified directory, with the reasons and first-year cost written out.' },
  { h: 'Setup', p: 'Greeting, script, FAQs, booking, transfer and after-hours rules, recording consent wording, and call summaries.' },
  { h: 'Testing', p: '20 scripted test calls, including the tricky ones, before your number goes live.' },
  { h: '60 days of tuning', p: 'Weekly call reviews and fixes, with a written results report at day 30 and day 60.' },
];
