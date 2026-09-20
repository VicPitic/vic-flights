export const AIRPORTS = {
  CLJ: { code: 'CLJ', city: 'Cluj-Napoca', country: 'Romania', lat: 46.7852, lng: 23.6862 },
  LON: { code: 'LON', city: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  NCE: { code: 'NCE', city: 'Nice', country: 'France', lat: 43.6653, lng: 7.215 },
  BGY: { code: 'BGY', city: 'Milan Bergamo', country: 'Italy', lat: 45.6739, lng: 9.7042 },
  LCA: { code: 'LCA', city: 'Larnaca', country: 'Cyprus', lat: 34.8751, lng: 33.6249 },
  ZRH: { code: 'ZRH', city: 'Zurich', country: 'Switzerland', lat: 47.4581, lng: 8.5555 },
  BUD: { code: 'BUD', city: 'Budapest', country: 'Hungary', lat: 47.4394, lng: 19.2618 },
  ICN: { code: 'ICN', city: 'Seoul Incheon', country: 'South Korea', lat: 37.4602, lng: 126.4407 },
  NRT: { code: 'NRT', city: 'Tokyo Narita', country: 'Japan', lat: 35.772, lng: 140.3929 },
  HND: { code: 'HND', city: 'Tokyo Haneda', country: 'Japan', lat: 35.5494, lng: 139.7798 },
  NYO: { code: 'NYO', city: 'Stockholm Skavsta', country: 'Sweden', lat: 58.7886, lng: 16.9122 },
  LTN: { code: 'LTN', city: 'London Luton', country: 'United Kingdom', lat: 51.8747, lng: -0.3683 },
  STN: { code: 'STN', city: 'London Stansted', country: 'United Kingdom', lat: 51.885, lng: 0.235 },
  BCN: { code: 'BCN', city: 'Barcelona', country: 'Spain', lat: 41.2974, lng: 2.0833 },
  OTP: { code: 'OTP', city: 'Bucharest', country: 'Romania', lat: 44.5711, lng: 26.085 },
  FRA: { code: 'FRA', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lng: 8.5622 },
  SFO: { code: 'SFO', city: 'San Francisco', country: 'United States', lat: 37.6213, lng: -122.379 },
  MUC: { code: 'MUC', city: 'Munich', country: 'Germany', lat: 48.3538, lng: 11.7861 },
  MSP: { code: 'MSP', city: 'Minneapolis–Saint Paul', country: 'United States', lat: 44.8848, lng: -93.2223 }
};

export const FLIGHTS = [
  {
    id: 'london-2023',
    year: 2023,
    name: 'London',
    segments: [{ from: 'CLJ', to: 'LON' }]
  },
  {
    id: 'nice-2024',
    year: 2024,
    name: 'Nice',
    segments: [
      { from: 'CLJ', to: 'NCE' },
      { from: 'NCE', to: 'CLJ' }
    ]
  },
  {
    id: 'milan-2024',
    year: 2024,
    name: 'Milan',
    segments: [
      { from: 'CLJ', to: 'BGY' },
      { from: 'BGY', to: 'CLJ' }
    ]
  },
  {
    id: 'larnaca-2025',
    year: 2025,
    name: 'Larnaca',
    segments: [
      { from: 'CLJ', to: 'LCA' },
      { from: 'LCA', to: 'CLJ' }
    ]
  },
  {
    id: 'zurich-2025',
    year: 2025,
    name: 'Zurich',
    segments: [
      { from: 'CLJ', to: 'ZRH' },
      { from: 'ZRH', to: 'CLJ' }
    ]
  },
  {
    id: 'tokyo-2026',
    year: 2026,
    name: 'Tokyo via Seoul',
    segments: [
      { from: 'BUD', to: 'ICN' },
      { from: 'ICN', to: 'NRT' },
      { from: 'HND', to: 'ICN' },
      { from: 'ICN', to: 'BUD' }
    ]
  },
  {
    id: 'stockholm-2026',
    year: 2026,
    name: 'Stockholm',
    segments: [
      { from: 'CLJ', to: 'NYO' },
      { from: 'NYO', to: 'CLJ' }
    ]
  },
  {
    id: 'london-2026',
    year: 2026,
    name: 'London',
    segments: [
      { from: 'CLJ', to: 'LTN' },
      { from: 'STN', to: 'CLJ' }
    ]
  },
  {
    id: 'barcelona-2026',
    year: 2026,
    name: 'Barcelona',
    segments: [
      { from: 'CLJ', to: 'BCN' },
      { from: 'BCN', to: 'CLJ' }
    ]
  },
  {
    id: 'milan-2026',
    year: 2026,
    name: 'Milan',
    segments: [
      { from: 'CLJ', to: 'BGY' },
      { from: 'BGY', to: 'CLJ' }
    ]
  },
  {
    id: 'bucharest-2026',
    year: 2026,
    name: 'Bucharest',
    segments: [
      { from: 'CLJ', to: 'OTP' },
      { from: 'OTP', to: 'CLJ' }
    ]
  },
  {
    id: 'san-francisco-2026',
    year: 2026,
    name: 'San Francisco via Frankfurt',
    segments: [
      { from: 'BUD', to: 'FRA' },
      { from: 'FRA', to: 'SFO' }
    ]
  },
  {
    id: 'minneapolis-2026',
    year: 2026,
    name: 'Minneapolis',
    segments: [
      { from: 'SFO', to: 'MSP' },
      { from: 'MSP', to: 'SFO' }
    ]
  },
  {
    id: 'budapest-return-2026',
    year: 2026,
    future: true,
    name: 'Budapest via Munich',
    segments: [
      { from: 'SFO', to: 'MUC' },
      { from: 'MUC', to: 'BUD' }
    ]
  }
];
