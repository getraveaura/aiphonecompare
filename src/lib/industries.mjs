export const ACCENTS = {
  dental: '#1f5f4a',
  legal: '#2c4574',
  plumbing: '#7a4320',
  medical: '#1a5960',
  hvac: '#3c684c',
  roofing: '#69422f',
  other: '#5c564c',
};

export function accent(id) {
  return ACCENTS[id] || ACCENTS.other;
}
