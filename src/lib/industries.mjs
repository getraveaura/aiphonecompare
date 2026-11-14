export const ACCENTS = {
  dental: '#1f5f4a',
  legal: '#2c4574',
  plumbing: '#7a4320',
  medical: '#1a5960',
  hvac: '#3c684c',
  roofing: '#69422f',
  'med-spa': '#6b4a5f',
  veterinary: '#2a5f6a',
  chiro: '#3d5c52',
  property: '#4a5560',
  auto: '#5a4a3a',
  salon: '#7a4d62',
  other: '#5c564c',
};

export function accent(id) {
  return ACCENTS[id] || ACCENTS.other;
}
