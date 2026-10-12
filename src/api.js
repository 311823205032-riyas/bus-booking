const STORAGE_KEY = 'nightowl-bookings';

const buses = [
  { id: 'moonlit', operator: 'Moonlit Travels', coach: 'Volvo 9600 · AC sleeper', type: 'Sleeper', depart: '21:15', arrive: '05:45', duration: '8h 30m', price: 1499, rating: '4.8', reviewCount: 284, seatsLeft: 7, amenities: ['Blanket', 'USB charging', 'Live tracking'], badge: 'Top rated' },
  { id: 'coastline', operator: 'Coastline Express', coach: 'Scania multi-axle · AC sleeper', type: 'Sleeper', depart: '22:00', arrive: '06:20', duration: '8h 20m', price: 1299, rating: '4.6', reviewCount: 196, seatsLeft: 4, amenities: ['Blanket', 'Water bottle', 'Reading light'], badge: '' },
  { id: 'bluefern', operator: 'Bluefern Mobility', coach: 'Volvo 9400 · AC seater', type: 'Seater', depart: '20:40', arrive: '05:50', duration: '9h 10m', price: 899, rating: '4.5', reviewCount: 128, seatsLeft: 12, amenities: ['Reclining seats', 'USB charging', 'Water bottle'], badge: 'Great value' },
  { id: 'wayfarer', operator: 'Wayfarer Nightline', coach: 'Mercedes-Benz · AC sleeper', type: 'Sleeper', depart: '23:30', arrive: '07:10', duration: '7h 40m', price: 1799, rating: '4.9', reviewCount: 342, seatsLeft: 3, amenities: ['Blanket', 'Wi-Fi', 'Live tracking'], badge: '' },
  { id: 'orbit', operator: 'Orbit Journeys', coach: 'BharatBenz · AC seater', type: 'Seater', depart: '19:50', arrive: '05:25', duration: '9h 35m', price: 799, rating: '4.4', reviewCount: 97, seatsLeft: 9, amenities: ['Reclining seats', 'Water bottle'], badge: '' },
];

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export async function searchBuses(search) {
  await wait(650);
  return buses.map((bus) => ({ ...bus, from: search.from, to: search.to }));
}

export async function completeDemoPayment(booking) {
  await wait(700);
  const pnr = `NW${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const confirmed = { ...booking, pnr, bookedAt: new Date().toISOString() };
  const existing = getBookings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([confirmed, ...existing]));
  return confirmed;
}

export function getBookings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function getBookingByPnr(pnr) {
  return getBookings().find((booking) => booking.pnr === pnr);
}