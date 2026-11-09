const BASE = [
  'What is the monthly price, what does that price include, and what is the overage rate?',
  'Is there a setup fee, a minimum term, or a fee to cancel early?',
  'If a caller asks for a person, or says the call is an emergency, what happens, including after hours?',
  'Does it book into the calendar or job system you already use, and who fixes a booking that is wrong?',
  'Will the vendor sign a business associate agreement before any patient or client detail is spoken? A HIPAA badge is not that agreement.',
  'Does the vendor record or transcribe calls, what notice does the caller hear, and does that notice match the caller\'s state? The call-recording page is https://aiphonecompare.com/call-recording-consent-by-state/',
  'Which languages does it actually handle, including names and addresses, and what happens when it does not understand?',
  'What changed in the published price in the last year, and where is that written down?',
];

const EXTRA = {
  'callers-reject-ai': 'Can I hear a recording of a real call from a business like mine, and can the caller reach a person without starting the conversation over?',
  'awkward-bot-reply': 'What did the first week of real calls sound like, and can I turn it off the same day if callers object?',
  'no-transfer-to-person': 'Show me the path a caller uses to reach a person. Is that path available after hours and on weekends?',
  'spanish-names': 'Can I place a test call in Spanish, with a full name and a street address, before I sign?',
  'phantom-booking': 'What happens when the agent books a time the schedule cannot keep, and who calls the customer back?',
  'urgent-booked-next-day': 'For an emergency, can it book the on-call window tonight, or only the next open daytime slot?',
  'human-override': 'Who on my team has to approve what the agent did, and how fast does that summary arrive?',
  'caller-not-told': 'Does the greeting say the caller is talking to an AI, in words a first-time caller will hear?',
  'after-hours-waiting': 'Is after-hours coverage on today, or is it waiting on a feature? What answers the phone until then?',
  'comparable-firm-stat': 'Which of the numbers in the case study are this vendor\'s results for a firm like mine, and which are from a different firm?',
  'data-sharing-concern': 'What call audio, transcripts, and customer details does the vendor keep, and for how long?',
  'does-not-replace-staff': 'Which calls still need a person on my team, and is that person included in the price?',
};

export function questionsFor(catches = []) {
  const questions = [...BASE];
  const seen = new Set(questions);
  for (const item of catches) {
    const extra = EXTRA[item.id];
    if (extra && !seen.has(extra)) {
      seen.add(extra);
      questions.push(extra);
    }
  }
  return questions;
}
