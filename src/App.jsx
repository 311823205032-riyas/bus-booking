import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowLeftRight, ArrowRight, Armchair, BedDouble, BusFront,
  CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Download, Mail,
  MapPin, Moon, Navigation, Phone, Printer, Search, Share2, ShieldCheck,
  SlidersHorizontal, Star, Sun, Ticket, Users, X,
} from 'lucide-react';
import { completeDemoPayment, getBookingByPnr, getBookings, searchBuses } from './api.js';
import CoachPhotoGallery from './CoachPhotoGallery.jsx';

const today = new Date();
const dateValue = (offset = 1) => {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const weekendDateValue = () => {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;
const popularRoutes = [['Bengaluru', 'Chennai'], ['Bengaluru', 'Hyderabad'], ['Chennai', 'Coimbatore']];
const cities = ['Bengaluru', 'Chennai', 'Hyderabad', 'Coimbatore', 'Kochi', 'Mysuru', 'Madurai', 'Pune'];
const occupiedByBus = { moonlit: [3, 8, 12, 14, 19], coastline: [1, 2, 10, 15, 18], bluefern: [5, 7, 11], wayfarer: [2, 6, 16, 20], orbit: [4, 9, 13] };
const womenOnlyByBus = { moonlit: [4, 9], coastline: [6, 17], bluefern: [2, 14], wayfarer: [5, 18], orbit: [7, 16] };
const newPassenger = () => ({ name: '', age: '', gender: '' });

function readRecentSearches() {
  try {
    const recent = JSON.parse(localStorage.getItem('nightowl-recent-searches') || '[]');
    return Array.isArray(recent) ? recent : [];
  } catch {
    return [];
  }
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('nightowl-theme') || 'light');
  const [search, setSearch] = useState({ from: 'Bengaluru', to: 'Chennai', date: dateValue() });
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [points, setPoints] = useState({ boarding: 'Majestic bus stand · 9:00 PM', dropping: 'Koyambedu · 5:45 AM' });
  const [passengers, setPassengers] = useState([]);
  const [contact, setContact] = useState({ phone: '', email: '' });
  const [ticket, setTicket] = useState(null);
  const [bookingsVersion, setBookingsVersion] = useState(0);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nightowl-theme', theme);
  }, [theme]);

  useEffect(() => { setError(''); window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    const page = path === '/' ? 'Home' : path === '/results' ? 'Buses' : path.startsWith('/seats/') ? 'Choose seats' : path === '/passengers' ? 'Passenger details' : path.startsWith('/ticket/') ? 'Your ticket' : path === '/bookings' ? 'My bookings' : 'Page not found';
    document.title = `${page} | Wayline Transit`;
  }, [location.pathname]);

  const handleSearch = async (navigateTo, nextSearch = search) => {
    if (!nextSearch.from.trim() || !nextSearch.to.trim()) { setError('Add both your starting city and destination to search.'); return; }
    if (nextSearch.from.trim().toLowerCase() === nextSearch.to.trim().toLowerCase()) { setError('Choose two different cities for your journey.'); return; }
    setError('');
    const normalized = { ...nextSearch, from: nextSearch.from.trim(), to: nextSearch.to.trim() };
    setSearch(normalized);
    const updatedRecent = [normalized, ...readRecentSearches().filter((item) => item.from !== normalized.from || item.to !== normalized.to || item.date !== normalized.date)].slice(0, 4);
    localStorage.setItem('nightowl-recent-searches', JSON.stringify(updatedRecent));
    setRecentSearches(updatedRecent);
    try {
      const result = await searchBuses(normalized);
      setBuses(result);
      navigateTo('/results');
    } catch {
      setError('We could not load bus options. Check your connection and try again.');
    }
  };

  const startBooking = (bus, navigate) => {
    setSelectedBus(bus);
    setSelectedSeats([]);
    setPassengers([]);
    setContact({ phone: '', email: '' });
    setPoints({ boarding: `${search.from} bus stand · 9:00 PM`, dropping: `${search.to} central · 5:45 AM` });
    navigate(`/seats/${bus.id}`);
  };

  const handleSeats = (seat, navigate) => {
    const next = selectedSeats.includes(seat) ? selectedSeats.filter((item) => item !== seat) : selectedSeats.length < 5 ? [...selectedSeats, seat] : selectedSeats;
    if (next.length === selectedSeats.length && !selectedSeats.includes(seat)) { setError('You can book up to 5 seats in one booking.'); return; }
    setSelectedSeats(next);
    setPassengers(next.map((_, index) => passengers[index] || newPassenger()));
    setError('');
    if (window.innerWidth < 700 && next.length && selectedSeats.length === 0) setTimeout(() => document.getElementById('seat-continue')?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 120);
  };

  const handlePayment = async (contact) => {
    setError('');
    const missingPassenger = passengers.findIndex((passenger) => !passenger.name.trim() || !passenger.age || !passenger.gender);
    if (missingPassenger !== -1) { setError(`Add a name, age, and gender for passenger ${missingPassenger + 1}.`); return; }
    if (!/^\d{10}$/.test(contact.phone.replace(/\D/g, ''))) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) { setError('Enter a valid email address for your ticket.'); return; }
    setPaymentBusy(true);
    try {
      const confirmed = await completeDemoPayment({ search, bus: selectedBus, seats: selectedSeats, passengers, contact, points, total: selectedSeats.length * selectedBus.price });
      setTicket(confirmed);
      setBookingsVersion((version) => version + 1);
      navigate(`/ticket/${confirmed.pnr}`);
    } catch {
      setError('We could not save your booking. Check your browser storage and try again.');
    } finally { setPaymentBusy(false); }
  };

  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  return <div className="app-shell">
    <Header theme={theme} toggleTheme={toggleTheme} />
    <main id="main-content">
      <Routes>
        <Route path="/" element={<Home search={search} setSearch={setSearch} recentSearches={recentSearches} onSearch={handleSearch} error={error} setError={setError} />} />
        <Route path="/results" element={<Results search={search} buses={buses} setBuses={setBuses} onSearch={handleSearch} onChoose={startBooking} error={error} />} />
        <Route path="/seats/:busId" element={<SeatSelection bus={selectedBus} search={search} seats={selectedSeats} onToggle={handleSeats} points={points} setPoints={setPoints} error={error} setError={setError} />} />
        <Route path="/passengers" element={<PassengerDetails bus={selectedBus} seats={selectedSeats} search={search} passengers={passengers} setPassengers={setPassengers} contact={contact} setContact={setContact} onPay={handlePayment} busy={paymentBusy} error={error} />} />
        <Route path="/ticket/:pnr" element={<TicketPage ticket={ticket} setTicket={setTicket} />} />
        <Route path="/bookings" element={<Bookings key={bookingsVersion} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </div>;
}

function Header({ theme, toggleTheme }) {
  const location = useLocation();
  const step = location.pathname.startsWith('/seats/') ? 1 : location.pathname === '/passengers' ? 2 : location.pathname.startsWith('/ticket/') ? 3 : 0;
  return <header className="site-header">
    <div className="nav-wrap">
      <Link className="brand-link" to="/" aria-label="Wayline Transit home"><BrandLogo /></Link>
      {step > 0 && <div className="flow-progress" aria-label="Booking progress"><span className={step === 1 ? 'active' : 'done'}>1 <b>Seats</b></span><i /><span className={step === 2 ? 'active' : step > 2 ? 'done' : ''}>2 <b>Passengers</b></span><i /><span className={step === 3 ? 'active' : ''}>3 <b>Ticket</b></span></div>}
      <nav className="nav-actions" aria-label="Main navigation">
        <Link className="nav-link" to="/bookings"><Ticket size={16} /> My bookings</Link>
        <a className="nav-link help-link" href="mailto:help@wayline.in"><CircleHelp size={16} /> Help</a>
        <button className="icon-button theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
      </nav>
    </div>
  </header>;
}

function BrandLogo() {
  return <span className="brand"><span className="brand-mark"><BusFront size={19} strokeWidth={2} /></span><span>Wayline Transit</span></span>;
}

function RouteMotif({ from, to, compact = false }) {
  return <div className={`route-motif${compact ? ' compact' : ''}`} aria-label={`${from} to ${to}`}>
    <div className="route-stop"><span className="stop-dot" /><span>{from}</span></div>
    <div className="route-track"><span className="route-pulse" /></div>
    <div className="route-stop destination"><span>{to}</span><span className="stop-dot" /></div>
  </div>;
}

function ErrorMessage({ children }) { return children ? <p className="form-error" role="alert"><CircleHelp size={16} />{children}</p> : null; }

function WomenMark({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5" /><path d="M12 13v9m-4-4h8" /></svg>;
}

function Home({ search, setSearch, recentSearches, onSearch, error, setError }) {
  const navigate = useNavigate();
  const update = (key, value) => { setSearch((current) => ({ ...current, [key]: value })); setError(''); };
  const submit = (event) => { event.preventDefault(); onSearch(navigate); };
  const swap = () => setSearch((current) => ({ ...current, from: current.to, to: current.from }));
  return <>
    <section className="home-hero">
      <div className="hero-copy">
        <p className="hero-kicker">Overnight travel, made easy</p>
        <h1>Your next journey,<br /><span>well underway.</span></h1>
        <p>Comfortable overnight rides across South India, with the details made clear.</p>
        <div className="hero-route-wrap"><RouteMotif from={search.from || 'Your city'} to={search.to || 'Somewhere new'} /></div>
        <div className="hero-notes"><span><ShieldCheck size={16} /> Thoughtful operators</span><span><BedDouble size={16} /> Rest-ready rides</span></div>
      </div>
    </section>
    <section className="search-section" aria-label="Search for a bus">
      <div className="section-heading"><div><h2>Plan your journey</h2></div><span className="section-note">Choose a route and departure date.</span></div>
      <form className="search-card" onSubmit={submit}>
        <label className="search-field"><span className="field-label">From</span><span className="field-control"><MapPin size={18} /><input aria-label="From city" list="south-cities" value={search.from} onChange={(event) => update('from', event.target.value)} placeholder="Your starting city" /><datalist id="south-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist></span></label>
        <button className="swap-button" type="button" onClick={swap} aria-label="Swap starting city and destination" title="Swap cities"><ArrowLeftRight size={17} /></button>
        <label className="search-field"><span className="field-label">To</span><span className="field-control"><Navigation size={18} /><input aria-label="Destination city" list="south-cities" value={search.to} onChange={(event) => update('to', event.target.value)} placeholder="Where are you headed?" /></span></label>
        <label className="search-field date-field"><span className="field-label">Departure</span><span className="field-control"><CalendarDays size={18} /><input aria-label="Departure date" type="date" min={dateValue(0)} value={search.date} onChange={(event) => update('date', event.target.value)} /></span></label>
        <button className="button-primary search-submit" type="submit"><Search size={17} /> Search buses <ArrowRight size={16} /></button>
      </form>
      <div className="search-extras"><div className="date-shortcuts" aria-label="Quick departure dates"><span>Leave</span><button className={search.date === dateValue() ? 'selected' : ''} type="button" onClick={() => update('date', dateValue())}>Tomorrow</button><button className={search.date === weekendDateValue() ? 'selected' : ''} type="button" onClick={() => update('date', weekendDateValue())}>This weekend</button></div>{recentSearches.length > 0 && <div className="recent-searches"><span>Recent</span>{recentSearches.slice(0, 3).map((recent) => <button type="button" key={`${recent.from}-${recent.to}-${recent.date}`} onClick={() => { setSearch(recent); onSearch(navigate, recent); }}>{recent.from} <ArrowRight size={12} /> {recent.to}<small>{formatDate(recent.date)}</small></button>)}</div>}</div>
      <ErrorMessage>{error}</ErrorMessage>
    </section>
    <CoachPhotoGallery />
    <section className="popular-section"><div className="popular-title"><h2>Good places to wake up</h2><p>Popular overnight routes</p></div><div className="route-chips">{popularRoutes.map(([from, to], index) => <button className="route-chip" key={from + to} type="button" onClick={() => { setSearch({ from, to, date: search.date || dateValue() }); }}><span className="chip-index">0{index + 1}</span><span>{from}</span><ArrowRight size={15} /><span>{to}</span></button>)}</div></section>
    <TrustStrip />
  </>;
}

function TrustStrip() {
  return <section className="trust-strip" aria-label="Wayline Transit promises"><div><ShieldCheck size={18} /><span><strong>Carefully chosen</strong><small>Operators we trust</small></span></div><div><Armchair size={18} /><span><strong>Sleep in comfort</strong><small>Real seat details upfront</small></span></div><div><Clock3 size={18} /><span><strong>Arrive on time</strong><small>Clear trip information</small></span></div></section>;
}

function Results({ search, buses, setBuses, onSearch, onChoose, error }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!buses.length);
  const [sort, setSort] = useState('recommended');
  const [types, setTypes] = useState([]);
  const [minPrice, setMinPrice] = useState(700);
  const [maxPrice, setMaxPrice] = useState(2500);
  const [departure, setDeparture] = useState('any');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (buses.length) { setLoading(false); return; }
    let alive = true;
    searchBuses(search).then((results) => { if (alive) { setBuses(results); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => { if (event.key === 'Escape') setFiltersOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  const results = useMemo(() => buses.filter((bus) => {
    const hour = Number(bus.depart.slice(0, 2));
    const matchesDeparture = departure === 'any' || (departure === 'morning' && hour < 12) || (departure === 'evening' && hour >= 17 && hour < 21) || (departure === 'night' && (hour >= 21 || hour < 5));
    return (!types.length || types.includes(bus.type)) && bus.price >= minPrice && bus.price <= maxPrice && matchesDeparture;
  }).sort((a, b) => sort === 'cheapest' ? a.price - b.price : sort === 'fastest' ? durationMinutes(a.duration) - durationMinutes(b.duration) : sort === 'earliest' ? a.depart.localeCompare(b.depart) : Number(b.rating) - Number(a.rating)), [buses, types, minPrice, maxPrice, departure, sort]);
  const toggleType = (type) => setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  const clearFilters = () => { setTypes([]); setMinPrice(700); setMaxPrice(2500); setDeparture('any'); };
  const filterCount = types.length + (minPrice !== 700 || maxPrice !== 2500 ? 1 : 0) + (departure !== 'any' ? 1 : 0);
  const cheapestId = results.length ? results.reduce((best, bus) => bus.price < best.price ? bus : best, results[0]).id : null;
  const fastestId = results.length ? results.reduce((best, bus) => durationMinutes(bus.duration) < durationMinutes(best.duration) ? bus : best, results[0]).id : null;

  return <div className="page-wrap results-page">
    <div className="results-heading"><div><p className="eyebrow">Your journey</p><h1>{search.from} <ArrowRight size={25} /> {search.to}</h1><p>{formatDate(search.date)} <span className="heading-divider">·</span> {loading ? 'Finding your ride…' : `${results.length} overnight rides`}</p></div><button className="button-secondary edit-search" onClick={() => navigate('/')}><ArrowLeft size={16} /> Change search</button></div>
    <div className="results-layout">
      {filtersOpen && <button className="filter-backdrop" type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
      <aside className={`filters-panel${filtersOpen ? ' filters-open' : ''}`} role={filtersOpen ? 'dialog' : undefined} aria-modal={filtersOpen || undefined} aria-label={filtersOpen ? 'Filter bus results' : undefined}><div className="filter-heading"><h2>Refine</h2><div className="filter-heading-actions"><button type="button" className="text-button" onClick={clearFilters}>Clear all</button><button type="button" className="mobile-filter-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={18} /></button></div></div>
        <fieldset className="filter-group"><legend>Bus type</legend><label className="check-row"><input type="checkbox" checked={types.includes('Sleeper')} onChange={() => toggleType('Sleeper')} /><BedDouble size={16} /> Sleeper <span>Rest easy</span></label><label className="check-row"><input type="checkbox" checked={types.includes('Seater')} onChange={() => toggleType('Seater')} /><Armchair size={16} /> Seater</label></fieldset>
        <fieldset className="filter-group price-range-group"><legend>Price range</legend><div className="price-range-values"><label>From <strong>{money(minPrice)}</strong><input className="price-slider" type="range" min="700" max="2500" step="100" value={minPrice} onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice))} aria-label="Minimum ticket price" /></label><label>Up to <strong>{money(maxPrice)}</strong><input className="price-slider" type="range" min="700" max="2500" step="100" value={maxPrice} onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice))} aria-label="Maximum ticket price" /></label></div><div className="range-labels"><span>₹700</span><span>₹2,500+</span></div></fieldset>
        <fieldset className="filter-group"><legend>Departure time</legend><label className="radio-row"><input type="radio" name="departure" checked={departure === 'any'} onChange={() => setDeparture('any')} />Any time</label><label className="radio-row"><input type="radio" name="departure" checked={departure === 'morning'} onChange={() => setDeparture('morning')} />Morning <span>5 AM–12 PM</span></label><label className="radio-row"><input type="radio" name="departure" checked={departure === 'evening'} onChange={() => setDeparture('evening')} />Evening <span>5 PM–9 PM</span></label><label className="radio-row"><input type="radio" name="departure" checked={departure === 'night'} onChange={() => setDeparture('night')} />Night <span>9 PM–5 AM</span></label></fieldset>
        <button className="button-primary apply-mobile-filters" type="button" onClick={() => setFiltersOpen(false)}>Show {results.length} rides</button>
      </aside>
      <section className="bus-results" aria-live="polite"><div className="results-toolbar"><span>{loading ? 'Checking operators' : `${results.length} rides for ${formatDate(search.date)}`}</span><div className="results-controls"><button className="mobile-filter-toggle" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> Filters {filterCount > 0 && <span>{filterCount}</span>}</button><label>Sort by <select aria-label="Sort results" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="earliest">Earliest departure</option><option value="cheapest">Cheapest</option><option value="fastest">Fastest</option></select><ChevronDown size={14} /></label></div></div>
        {loading ? <div className="skeleton-list" aria-label="Loading buses">{[1, 2, 3].map((item) => <div className="bus-skeleton" key={item}><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div> : results.length ? <div className="bus-list">{results.map((bus) => <BusCard key={bus.id} bus={bus} search={search} badges={[...(bus.id === cheapestId ? ['Cheapest'] : []), ...(bus.id === fastestId ? ['Fastest'] : [])]} onChoose={() => onChoose(bus, navigate)} />)}</div> : <div className="empty-state"><span className="empty-icon"><Search size={22} /></span><h2>No buses found, try another date</h2><p>Change your filters or take a look at another night.</p><button className="button-secondary" onClick={() => navigate('/')}>Choose another date <ArrowRight size={15} /></button></div>}
      </section>
    </div>
    <ErrorMessage>{error}</ErrorMessage>
  </div>;
}

function durationMinutes(value) { const [hours, minutes] = value.replace('h', '').replace('m', '').split(' ').map(Number); return hours * 60 + minutes; }

function BusCard({ bus, search, onChoose, badges = [] }) {
  return <article className="bus-card"><div className="bus-topline"><div><h2>{bus.operator}</h2><p>{bus.coach}</p></div><div className="bus-badges">{bus.badge && <span className="bus-badge">{bus.badge}</span>}{badges.map((badge) => <span className={`bus-badge best-${badge.toLowerCase()}`} key={badge}>{badge}</span>)}</div></div>
    <div className="bus-card-main"><div className="bus-timing"><div className="timing-point"><strong>{bus.depart}</strong><span>{search.from}</span></div><div className="timing-route"><RouteMotif from="" to="" compact /><span className="route-duration">{bus.duration}</span></div><div className="timing-point arrival"><strong>{bus.arrive}<sup>+1</sup></strong><span>{search.to}</span></div></div><div className="bus-offer"><div className="bus-price"><span>From</span><strong>{money(bus.price)}</strong></div><button className="button-primary choose-bus" onClick={onChoose}>View seats <ArrowRight size={15} /></button></div></div>
    <div className="bus-card-bottom"><div className="bus-meta"><span className="rating"><Star size={15} fill="currentColor" /> {bus.rating} <small>({bus.reviewCount})</small></span><span className="amenity-item"><BusFront size={15} /> {bus.type}</span><span className="seats-left"><Armchair size={15} /> {bus.seatsLeft} seats left</span>{bus.amenities.map((amenity) => <span className="amenity-item" key={amenity}>{amenity}</span>)}</div></div>
  </article>;
}

function SeatSelection({ bus, search, seats, onToggle, points, setPoints, error, setError }) {
  const navigate = useNavigate();
  if (!bus) return <JourneyRecovery />;
  const occupied = occupiedByBus[bus.id] || [];
  const changePoint = (key, value) => setPoints((current) => ({ ...current, [key]: value }));
  return <div className="page-wrap booking-page"><div className="booking-title"><Link className="back-link" to="/results"><ArrowLeft size={15} /> Results</Link><p className="eyebrow">Choose your seats</p><h1>{bus.operator}</h1><p>{search.from} to {search.to} <span>·</span> {formatDate(search.date)} <span>·</span> {bus.depart} departure</p></div>
    <div className="booking-grid"><section className="seat-panel"><div className="panel-head"><div><h2>Your seat, your space</h2><p>Select up to 5 seats. Hover to preview a seat.</p></div><span className="sleeper-type"><BedDouble size={15} /> {bus.type}</span></div>
      <div className="seat-layout"><div className="seat-driver"><span>Front of bus</span><div className="steering-wheel" aria-label="Driver's steering wheel"><span /></div></div><div className="seat-deck"><div className="deck-label">{bus.type === 'Seater' ? 'Lower deck · front' : 'Lower deck · sleeper'}</div><div className="seat-grid" role="group" aria-label="Bus seat map">{Array.from({ length: 20 }, (_, index) => index + 1).map((seat) => <SeatButton key={seat} seat={seat} price={bus.price} selected={seats.includes(seat)} occupied={occupied.includes(seat)} womenOnly={womenOnlyByBus[bus.id]?.includes(seat)} onClick={() => onToggle(seat)} />)}</div></div><div className="seat-legend"><span><i className="legend-seat available" /> Available</span><span><i className="legend-seat chosen" /> Selected</span><span><i className="legend-seat taken" /> Taken</span><span><WomenMark /> Women only</span></div></div>
      <div className="seat-selection-note"><span><Users size={16} /> {seats.length ? 'Selected seats' : 'Choose up to 5 seats'}</span><div className="selected-seat-list">{seats.length ? seats.map((seat) => <span key={seat}>S{String(seat).padStart(2, '0')}</span>) : <small>Nothing selected yet</small>}</div><span className="seat-count">{seats.length} / 5</span></div>
      <div className="point-pickers"><label><span><span className="point-dot boarding" /> Boarding point</span><select value={points.boarding} onChange={(event) => changePoint('boarding', event.target.value)}><option>{search.from} bus stand · 9:00 PM</option><option>Silk Board · 9:25 PM</option><option>Hebbal · 9:45 PM</option></select></label><label><span><span className="point-dot dropping" /> Dropping point</span><select value={points.dropping} onChange={(event) => changePoint('dropping', event.target.value)}><option>{search.to} central · 5:45 AM</option><option>{search.to} airport · 6:10 AM</option><option>{search.to} railway station · 6:25 AM</option></select></label></div>
    </section>
    <aside className="booking-summary"><h2>Your ride</h2><RouteMotif from={search.from} to={search.to} /><div className="summary-detail"><span>{formatDate(search.date)}</span><strong>{bus.depart} <ArrowRight size={13} /> {bus.arrive}</strong></div><div className="summary-detail"><span>Coach</span><strong>{bus.coach.split(' · ')[0]}</strong></div><div className="summary-divider" /><div className="summary-detail"><span>{seats.length || 0} seat{seats.length === 1 ? '' : 's'} × {money(bus.price)}</span><strong>{money(seats.length * bus.price)}</strong></div><ErrorMessage>{error}</ErrorMessage><button id="seat-continue" className="button-primary summary-cta" disabled={!seats.length} onClick={() => { setError(''); navigate('/passengers'); }}>Continue <ArrowRight size={16} /></button><p className="secure-note"><ShieldCheck size={14} /> Secure checkout, no surprises</p></aside></div>
    <div className="mobile-sticky-cta"><div><span>Total</span><strong>{money(seats.length * bus.price)}</strong></div><button className="button-primary" disabled={!seats.length} onClick={() => { setError(''); navigate('/passengers'); }}>Continue <ArrowRight size={16} /></button></div>
  </div>;
}

function SeatButton({ seat, price, selected, occupied, womenOnly, onClick }) {
  const status = occupied ? 'already taken' : selected ? 'selected' : 'available';
  return <button className={`seat${selected ? ' selected' : ''}${occupied ? ' occupied' : ''}${womenOnly ? ' women-only' : ''}`} type="button" disabled={occupied} onClick={onClick} title={`Seat ${seat} · ${money(price)}${womenOnly ? ' · Women only' : ''}`} aria-label={`Seat ${seat}, ${status}${womenOnly ? ', women only' : ''}, ${money(price)}`} aria-pressed={selected}><span>{String(seat).padStart(2, '0')}</span>{womenOnly && <span className="women-marker" aria-hidden="true"><WomenMark size={11} /></span>}<span className="seat-price">{money(price)}</span></button>;
}

function PassengerDetails({ bus, seats, search, passengers, setPassengers, contact, setContact, onPay, busy, error }) {
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState({});
  if (!bus || !seats.length) return <JourneyRecovery />;
  const clearFieldError = (key) => setFieldErrors((current) => ({ ...current, [key]: '' }));
  const updatePassenger = (index, key, value) => { setPassengers((current) => current.map((person, personIndex) => personIndex === index ? { ...person, [key]: value } : person)); clearFieldError(`passenger-${index}-${key}`); };
  const updateContact = (key, value) => { setContact((current) => ({ ...current, [key]: value })); clearFieldError(key); };
  const validateAndPay = () => {
    const nextErrors = {};
    passengers.forEach((person, index) => {
      if (!person.name.trim()) nextErrors[`passenger-${index}-name`] = 'Enter the passenger name.';
      if (!person.age || Number(person.age) < 1 || Number(person.age) > 120) nextErrors[`passenger-${index}-age`] = 'Enter an age from 1 to 120.';
      if (!person.gender) nextErrors[`passenger-${index}-gender`] = 'Choose a gender option.';
    });
    if (!/^\d{10}$/.test(contact.phone.replace(/\D/g, ''))) nextErrors.phone = 'Enter a valid 10-digit mobile number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) nextErrors.email = 'Enter a valid email address.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    onPay(contact);
  };
  return <div className="page-wrap booking-page passenger-page"><Link className="back-link" to={`/seats/${bus.id}`}><ArrowLeft size={15} /> Back to seats</Link><div className="passenger-header"><div><p className="eyebrow">Almost there</p><h1>Who's travelling?</h1><p>Add each passenger exactly as it appears on their ID.</p></div><div className="small-trip-summary"><RouteMotif from={search.from} to={search.to} compact /><span>{formatDate(search.date)} · {seats.length} passenger{seats.length === 1 ? '' : 's'}</span></div></div>
    <div className="booking-grid passenger-grid"><section className="passenger-panel">{passengers.map((person, index) => <fieldset className="passenger-card" key={seats[index]}><legend><span className="passenger-number">{index + 1}</span> Passenger {index + 1} <small>Seat {String(seats[index]).padStart(2, '0')}</small></legend><div className="passenger-fields"><label className={`form-field name-field${fieldErrors[`passenger-${index}-name`] ? ' invalid' : ''}`}>Full name<input autoComplete="name" value={person.name} onChange={(event) => updatePassenger(index, 'name', event.target.value)} onBlur={() => { if (!person.name.trim()) setFieldErrors((current) => ({ ...current, [`passenger-${index}-name`]: 'Enter the passenger name.' })); }} aria-invalid={Boolean(fieldErrors[`passenger-${index}-name`])} aria-describedby={fieldErrors[`passenger-${index}-name`] ? `passenger-${index}-name-error` : undefined} placeholder="Name as on ID" />{fieldErrors[`passenger-${index}-name`] && <small id={`passenger-${index}-name-error`} className="field-error">{fieldErrors[`passenger-${index}-name`]}</small>}</label><label className={`form-field age-field${fieldErrors[`passenger-${index}-age`] ? ' invalid' : ''}`}>Age<input type="number" min="1" max="120" value={person.age} onChange={(event) => updatePassenger(index, 'age', event.target.value)} onBlur={() => { if (!person.age || Number(person.age) < 1 || Number(person.age) > 120) setFieldErrors((current) => ({ ...current, [`passenger-${index}-age`]: 'Enter an age from 1 to 120.' })); }} aria-invalid={Boolean(fieldErrors[`passenger-${index}-age`])} aria-describedby={fieldErrors[`passenger-${index}-age`] ? `passenger-${index}-age-error` : undefined} placeholder="Age" />{fieldErrors[`passenger-${index}-age`] && <small id={`passenger-${index}-age-error`} className="field-error">{fieldErrors[`passenger-${index}-age`]}</small>}</label><label className={`form-field gender-field${fieldErrors[`passenger-${index}-gender`] ? ' invalid' : ''}`}>Gender<select value={person.gender} onChange={(event) => updatePassenger(index, 'gender', event.target.value)} aria-invalid={Boolean(fieldErrors[`passenger-${index}-gender`])} aria-describedby={fieldErrors[`passenger-${index}-gender`] ? `passenger-${index}-gender-error` : undefined}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select>{fieldErrors[`passenger-${index}-gender`] && <small id={`passenger-${index}-gender-error`} className="field-error">{fieldErrors[`passenger-${index}-gender`]}</small>}</label></div></fieldset>)}
      <fieldset className="contact-card"><legend>Where should we send your ticket?</legend><div className="passenger-fields"><label className={`form-field contact-field${fieldErrors.phone ? ' invalid' : ''}`}><span><Phone size={14} /> Mobile number</span><div className="input-with-prefix"><span>+91</span><input inputMode="numeric" autoComplete="tel" maxLength={14} value={contact.phone} onChange={(event) => updateContact('phone', event.target.value)} onBlur={() => { if (!/^\d{10}$/.test(contact.phone.replace(/\D/g, ''))) setFieldErrors((current) => ({ ...current, phone: 'Enter a valid 10-digit mobile number.' })); }} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'phone-error' : undefined} placeholder="10-digit number" /></div>{fieldErrors.phone && <small id="phone-error" className="field-error">{fieldErrors.phone}</small>}</label><label className={`form-field contact-field${fieldErrors.email ? ' invalid' : ''}`}><span><Mail size={14} /> Email address</span><input type="email" autoComplete="email" value={contact.email} onChange={(event) => updateContact('email', event.target.value)} onBlur={() => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) setFieldErrors((current) => ({ ...current, email: 'Enter a valid email address.' })); }} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} placeholder="you@example.com" />{fieldErrors.email && <small id="email-error" className="field-error">{fieldErrors.email}</small>}</label></div></fieldset>
      <ErrorMessage>{error}</ErrorMessage>
    </section><aside className="booking-summary"><h2>Fare summary</h2><div className="summary-detail"><span>{seats.length} {seats.length === 1 ? 'seat' : 'seats'}</span><strong>{money(bus.price * seats.length)}</strong></div><div className="summary-detail"><span>Taxes and fees</span><strong>Included</strong></div><div className="summary-divider" /><div className="summary-detail total-row"><span>Total to pay</span><strong>{money(bus.price * seats.length)}</strong></div><button className="button-primary summary-cta pay-button" disabled={busy} onClick={validateAndPay}>{busy ? <><span className="button-spinner" /> Confirming…</> : <>Pay {money(bus.price * seats.length)} <ArrowRight size={16} /></>}</button><p className="secure-note"><ShieldCheck size={14} /> Demo checkout · no payment taken</p></aside></div>
    <div className="mobile-sticky-cta"><div><span>{seats.length} selected · {seats.map((seat) => `S${String(seat).padStart(2, '0')}`).join(', ')}</span><strong>{money(bus.price * seats.length)}</strong></div><button className="button-primary" disabled={busy} onClick={validateAndPay}>{busy ? 'Confirming…' : 'Continue'} <ArrowRight size={16} /></button></div>
  </div>;
}

function TicketPage({ ticket, setTicket }) {
  const { pnr } = useParams();
  const [stored, setStored] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [ticketError, setTicketError] = useState('');
  const [pdfReady, setPdfReady] = useState(false);
  useEffect(() => { const found = getBookingByPnr(pnr); setStored(found || null); if (found) setTicket(found); }, [pnr]);
  const booking = ticket?.pnr === pnr ? ticket : stored;
  const payload = booking ? JSON.stringify({ pnr: booking.pnr, from: booking.search.from, to: booking.search.to, date: booking.search.date, seats: booking.seats }) : '';
  useEffect(() => {
    if (!payload) return;
    let active = true;
    import('qrcode').then(({ default: qrcode }) => qrcode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 240 })).then((image) => { if (active) setQrImage(image); }).catch(() => { if (active) setTicketError('The ticket QR code could not be generated.'); });
    return () => { active = false; };
  }, [payload]);

  const downloadPdf = async () => {
    setTicketError('');
    setPdfReady(false);
    try {
      const [{ jsPDF }, { default: qrcode }] = await Promise.all([import('jspdf'), import('qrcode')]);
      const image = qrImage || await qrcode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
      const pdf = new jsPDF({ unit: 'pt', format: 'a5' });
      pdf.setFillColor(11, 37, 69);
      pdf.rect(0, 0, 420, 95, 'F');
      pdf.setFillColor(29, 95, 209);
      pdf.roundedRect(34, 18, 30, 30, 5, 5, 'F');
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(1.5);
      pdf.roundedRect(40, 23, 18, 19, 2, 2, 'S');
      pdf.line(40, 29, 58, 29);
      pdf.circle(44, 37, 1, 'F');
      pdf.circle(54, 37, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('Wayline Transit', 75, 41);
      pdf.setFontSize(14);
      pdf.text('Mobile boarding pass', 75, 62);
      pdf.text(`Booking reference  ${booking.pnr}`, 250, 43);
      pdf.setTextColor(16, 24, 40);
      pdf.setFontSize(14);
      pdf.text('From', 34, 130);
      pdf.text('To', 250, 130);
      pdf.setFontSize(28);
      pdf.text(booking.search.from, 34, 157);
      pdf.text(booking.search.to, 250, 157);
      pdf.setDrawColor(180, 186, 194);
      pdf.setLineDashPattern([4, 4], 0);
      pdf.line(150, 150, 225, 150);
      pdf.setLineDashPattern([], 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      const rows = [
        `Date: ${formatDate(booking.search.date)}  |  Departure: ${booking.bus.depart}`,
        `Operator: ${booking.bus.operator}`,
        `Seat${booking.seats.length === 1 ? '' : 's'}: ${booking.seats.map((seat) => String(seat).padStart(2, '0')).join(', ')}`,
        `Passenger${booking.passengers.length === 1 ? '' : 's'}: ${booking.passengers.map((person) => person.name).join(', ')}`,
        `Boarding: ${booking.points.boarding}`,
        `Total paid: ${money(booking.total)}`,
      ];
      rows.forEach((row, index) => pdf.text(row, 34, 205 + index * 32, { maxWidth: 256 }));
      pdf.addImage(image, 'PNG', 304, 205, 78, 78);
      pdf.setFontSize(14);
      pdf.setTextColor(95, 106, 121);
      pdf.text(booking.bus.coach, 34, 410, { maxWidth: 340 });
      pdf.save(`wayline-${booking.pnr}.pdf`);
      setPdfReady(true);
    } catch {
      setTicketError('We could not create the PDF. Please try again or use Print ticket.');
    }
  };

  if (!booking) return <div className="page-wrap center-state"><h1>We couldn't find that ticket</h1><p>Check the booking reference or find your ticket in My bookings.</p><Link className="button-primary" to="/bookings">My bookings <ArrowRight size={16} /></Link></div>;
  const shareMessage = `Wayline Transit ticket ${booking.pnr}: ${booking.search.from} to ${booking.search.to} on ${formatDate(booking.search.date)}. Seat${booking.seats.length === 1 ? '' : 's'} ${booking.seats.join(', ')}.`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  return <div className="page-wrap ticket-page"><div className="ticket-success"><span className="success-check"><Check size={19} /></span><div><h1>All set. Sleep well.</h1><p>Your night journey is booked.</p></div><div className="ticket-buttons"><button className="button-secondary print-button" onClick={downloadPdf}><Download size={16} /> Download PDF</button><button className="button-secondary print-button" onClick={() => window.print()}><Printer size={16} /> Print ticket</button><a className="button-secondary print-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Share2 size={16} /> Share on WhatsApp</a></div></div>
    <article className="boarding-pass"><div className="pass-head"><div className="pass-brand"><BrandLogo /><span className="pass-label">Mobile boarding pass</span></div><div className="pass-pnr"><span>Booking reference</span><strong>{booking.pnr}</strong></div></div>
      <div className="pass-route"><div className="pass-station"><span>From</span><strong>{booking.search.from}</strong><small>{booking.points.boarding}</small></div><div className="pass-route-center"><RouteMotif from="" to="" /><span>{formatDate(booking.search.date)}</span></div><div className="pass-station destination"><span>To</span><strong>{booking.search.to}</strong><small>{booking.points.dropping}</small></div></div>
      <div className="perforation"><span /><i /><span /></div>
      <div className="pass-info"><div className="pass-facts"><div><span>Operator</span><strong>{booking.bus.operator}</strong></div><div><span>Departure</span><strong>{formatDate(booking.search.date)} · {booking.bus.depart}</strong></div><div><span>Seats</span><strong>{booking.seats.map((seat) => String(seat).padStart(2, '0')).join(', ')}</strong></div><div><span>Passengers</span><strong>{booking.passengers.map((passenger) => passenger.name).join(', ')}</strong></div><div><span>Boarding point</span><strong>{booking.points.boarding}</strong></div><div><span>Total paid</span><strong>{money(booking.total)}</strong></div></div><div className="qr-wrap">{qrImage ? <img className="qr-code-image" src={qrImage} alt={`Scannable ticket QR code for ${booking.pnr}`} /> : <span className="qr-placeholder" role="status">Preparing QR…</span>}<span>Scan at boarding</span></div></div>
      <div className="pass-foot"><span><ShieldCheck size={15} /> Keep this ticket handy when you board.</span><span>{booking.bus.coach}</span></div>
    </article>{ticketError && <ErrorMessage>{ticketError}</ErrorMessage>}{pdfReady && <p className="download-status" role="status">PDF downloaded. Check your downloads.</p>}<div className="ticket-actions"><Link className="text-button" to="/bookings"><ArrowLeft size={15} /> My bookings</Link><Link className="button-primary" to="/"><Search size={15} /> Find another ride</Link></div>
  </div>;
}

function Bookings() {
  const navigate = useNavigate();
  const bookings = getBookings();
  return <div className="page-wrap bookings-page"><div className="bookings-title"><div><p className="eyebrow">Your trips</p><h1>My bookings</h1><p>Tickets you have booked on this device.</p></div>{bookings.length > 0 && <span className="booking-count">{bookings.length} {bookings.length === 1 ? 'journey' : 'journeys'}</span>}</div>{bookings.length ? <div className="saved-bookings">{bookings.map((booking) => <article className="saved-booking" key={booking.pnr}><div className="saved-date"><strong>{new Date(`${booking.search.date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit' })}</strong><span>{new Date(`${booking.search.date}T12:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span></div><div className="saved-route"><RouteMotif from={booking.search.from} to={booking.search.to} compact /><p>{booking.bus.operator} <span>·</span> {booking.seats.length} {booking.seats.length === 1 ? 'seat' : 'seats'} <span>·</span> {booking.pnr}</p></div><div className="saved-total"><span>Total paid</span><strong>{money(booking.total)}</strong></div><button className="button-secondary saved-view" onClick={() => navigate(`/ticket/${booking.pnr}`)}>View ticket <ArrowRight size={14} /></button></article>)}</div> : <div className="empty-state bookings-empty"><span className="empty-icon"><Ticket size={23} /></span><h2>No trips booked yet</h2><p>Your next good night's sleep is one ride away.</p><Link className="button-primary" to="/"><Search size={15} /> Find a bus</Link></div>}</div>;
}

function JourneyRecovery() {
  return <div className="page-wrap center-state"><span className="empty-icon"><BusFront size={22} /></span><h1>Let's find your next ride</h1><p>Your trip details are no longer here. Start a new search to choose a seat.</p><Link className="button-primary" to="/">Search buses <ArrowRight size={16} /></Link></div>;
}

function NotFound() {
  return <div className="page-wrap center-state"><span className="not-found-code">404</span><h1>This road goes nowhere</h1><p>That page is not on this route. Head home to find a bus, or check your saved bookings.</p><div className="not-found-actions"><Link className="button-primary" to="/"><Search size={15} /> Find a bus</Link><Link className="button-secondary" to="/bookings"><Ticket size={15} /> My bookings</Link></div></div>;
}

function Footer() {
  return <footer className="site-footer"><Link className="brand-link footer-brand" to="/"><BrandLogo /></Link><nav className="footer-links" aria-label="Footer navigation"><a href="mailto:hello@wayline.in?subject=About%20Wayline%20Transit">About</a><a href="mailto:help@wayline.in">Support</a><a href="mailto:hello@wayline.in?subject=Terms%20of%20service">Terms</a><a href="mailto:hello@wayline.in?subject=Privacy">Privacy</a></nav><a className="footer-email" href="mailto:hello@wayline.in">hello@wayline.in</a></footer>;
}

export default App;