// Companio - Companionship rental marketplace (static demo)

const COMPANIONS = [
  {
    id: 'c01', name: 'Alex Rivera', age: 29, city: 'New York', rate: 75, rating: 4.9, reviews: 128,
    bio: 'Former tour guide who knows every great rooftop bar and hole-in-the-wall in the city.',
    interests: ['City tours', 'Nightlife', 'Foodie', 'Art galleries'],
    palette: ['#ff7a59', '#ffb199']
  },
  {
    id: 'c02', name: 'Jordan Park', age: 31, city: 'San Francisco', rate: 95, rating: 4.8, reviews: 86,
    bio: 'Tech-friendly conversationalist. Great for plus-one at industry mixers and dinners.',
    interests: ['Networking events', 'Conversation', 'Wine', 'Plus-one'],
    palette: ['#6ee7b7', '#34d399']
  },
  {
    id: 'c03', name: 'Sam Bennett', age: 27, city: 'Chicago', rate: 60, rating: 4.7, reviews: 64,
    bio: 'Running coach and gym buddy. Will keep you accountable and motivated.',
    interests: ['Fitness', 'Running', 'Hiking', 'Coffee'],
    palette: ['#60a5fa', '#3b82f6']
  },
  {
    id: 'c04', name: 'Riley Chen', age: 34, city: 'Los Angeles', rate: 110, rating: 5.0, reviews: 211,
    bio: 'Stylist and event planner. Best plus-one for weddings, galas, and red-carpet nights.',
    interests: ['Events', 'Plus-one', 'Style', 'Dancing'],
    palette: ['#f472b6', '#ec4899']
  },
  {
    id: 'c05', name: 'Morgan Lee', age: 26, city: 'Seattle', rate: 55, rating: 4.6, reviews: 42,
    bio: 'Board-game nerd and bookworm. Great for low-key cafe afternoons and quiet evenings.',
    interests: ['Board games', 'Reading', 'Cafe hangouts', 'Movies'],
    palette: ['#a78bfa', '#8b5cf6']
  },
  {
    id: 'c06', name: 'Casey Morgan', age: 30, city: 'Austin', rate: 70, rating: 4.8, reviews: 95,
    bio: 'Live-music fanatic. Honky-tonks, dive bars, food trucks &mdash; I know them all.',
    interests: ['Live music', 'Nightlife', 'Foodie', 'BBQ'],
    palette: ['#fbbf24', '#f59e0b']
  },
  {
    id: 'c07', name: 'Taylor Brooks', age: 33, city: 'Boston', rate: 85, rating: 4.9, reviews: 117,
    bio: 'History buff and walking tour guide. Make the Freedom Trail actually interesting.',
    interests: ['City tours', 'History', 'Museums', 'Walking'],
    palette: ['#22d3ee', '#06b6d4']
  },
  {
    id: 'c08', name: 'Dakota Reyes', age: 28, city: 'Miami', rate: 90, rating: 4.7, reviews: 78,
    bio: 'Salsa dancer and beach regular. Bring sunscreen and energy.',
    interests: ['Dancing', 'Beach', 'Nightlife', 'Fitness'],
    palette: ['#fb7185', '#e11d48']
  },
  {
    id: 'c09', name: 'Jamie Wallace', age: 32, city: 'New York', rate: 80, rating: 4.8, reviews: 154,
    bio: 'Theater nerd. Great company for Broadway nights and the post-show debrief over drinks.',
    interests: ['Theater', 'Plus-one', 'Dinner', 'Conversation'],
    palette: ['#c084fc', '#9333ea']
  },
  {
    id: 'c10', name: 'Hayden Cole', age: 35, city: 'Denver', rate: 65, rating: 4.6, reviews: 51,
    bio: 'Trail-runner and ski bum. Best company for outdoor weekends and mountain towns.',
    interests: ['Hiking', 'Skiing', 'Fitness', 'Outdoors'],
    palette: ['#4ade80', '#16a34a']
  },
  {
    id: 'c11', name: 'Reese Patel', age: 29, city: 'Chicago', rate: 75, rating: 4.9, reviews: 102,
    bio: 'Chef-trained foodie. I will find you the best deep-dish and the best omakase.',
    interests: ['Foodie', 'Cooking', 'Wine', 'Dinner'],
    palette: ['#fb923c', '#ea580c']
  },
  {
    id: 'c12', name: 'Quinn Davies', age: 31, city: 'San Francisco', rate: 100, rating: 4.9, reviews: 143,
    bio: 'Sommelier-in-training. Wine bars, tasting menus, and the occasional vineyard drive.',
    interests: ['Wine', 'Dinner', 'Conversation', 'Foodie'],
    palette: ['#e879f9', '#c026d3']
  }
];

const ACTIVITIES = [
  'Coffee / Conversation',
  'Dinner out',
  'Plus-one for an event',
  'City tour / Sightseeing',
  'Workout / Hiking',
  'Drinks / Nightlife',
  'Cultural outing (museum, theater)',
  'Other (describe in notes)'
];

const STORAGE_KEY = 'companio.bookings.v1';

// ---------- State ----------
const state = {
  filters: { city: '', interest: '', maxRate: 300, search: '' }
};

// ---------- Utilities ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function unique(arr) { return [...new Set(arr)]; }
function money(n) { return '$' + n.toLocaleString(); }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function loadBookings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveBookings(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ---------- Avatar SVG ----------
function avatarSvg(c) {
  const [a, b] = c.palette;
  const initials = c.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g-${c.id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${a}"/>
          <stop offset="100%" stop-color="${b}"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#g-${c.id})"/>
      <circle cx="100" cy="80" r="32" fill="rgba(255,255,255,0.85)"/>
      <path d="M40 180 Q100 110 160 180 Z" fill="rgba(255,255,255,0.85)"/>
      <text x="100" y="195" text-anchor="middle" font-family="-apple-system, sans-serif"
            font-size="14" font-weight="700" fill="rgba(0,0,0,0.7)">${initials}</text>
    </svg>
  `;
}

// ---------- Render: filters ----------
function populateFilters() {
  const citySel = $('#f-city');
  const interestSel = $('#f-interest');

  unique(COMPANIONS.map(c => c.city)).sort().forEach(city => {
    const opt = document.createElement('option');
    opt.value = city; opt.textContent = city;
    citySel.appendChild(opt);
  });

  unique(COMPANIONS.flatMap(c => c.interests)).sort().forEach(interest => {
    const opt = document.createElement('option');
    opt.value = interest; opt.textContent = interest;
    interestSel.appendChild(opt);
  });
}

// ---------- Render: companion grid ----------
function applyFilters() {
  const { city, interest, maxRate, search } = state.filters;
  const q = search.trim().toLowerCase();
  return COMPANIONS.filter(c => {
    if (city && c.city !== city) return false;
    if (interest && !c.interests.includes(interest)) return false;
    if (c.rate > maxRate) return false;
    if (q) {
      const hay = (c.name + ' ' + c.bio + ' ' + c.interests.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderGrid() {
  const grid = $('#companion-grid');
  const empty = $('#no-results');
  const list = applyFilters();

  grid.innerHTML = list.map(c => `
    <article class="card" data-id="${c.id}">
      <div class="card-photo">${avatarSvg(c)}</div>
      <div class="card-body">
        <div class="card-top">
          <div>
            <h3 class="card-name">${escapeHtml(c.name)}, ${c.age}</h3>
            <p class="card-meta">${escapeHtml(c.city)}</p>
          </div>
          <div class="card-rating" title="${c.reviews} reviews">
            &#9733; ${c.rating.toFixed(1)}
          </div>
        </div>
        <p class="card-bio">${c.bio}</p>
        <div class="tags">
          ${c.interests.slice(0, 4).map(i => `<span class="tag">${escapeHtml(i)}</span>`).join('')}
        </div>
      </div>
      <div class="card-footer">
        <div class="rate">${money(c.rate)}<small>/hr</small></div>
        <button class="btn btn-primary" data-book="${c.id}">Book</button>
      </div>
    </article>
  `).join('');

  empty.classList.toggle('hidden', list.length > 0);
}

// ---------- Booking modal ----------
function openBooking(companionId) {
  const c = COMPANIONS.find(x => x.id === companionId);
  if (!c) return;

  const minStart = nextHourLocalISO();
  $('#modal-body').innerHTML = `
    <div class="modal-header">
      <div class="avatar">${avatarSvg(c)}</div>
      <div>
        <h3>Book ${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(c.city)} &middot; ${money(c.rate)}/hr &middot; &#9733; ${c.rating.toFixed(1)} (${c.reviews})</p>
      </div>
    </div>
    <form id="booking-form" class="modal-body">
      <div class="field">
        <label for="b-activity">What did you have in mind?</label>
        <select id="b-activity" required>
          ${ACTIVITIES.map(a => `<option>${escapeHtml(a)}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="b-start">Start</label>
          <input type="datetime-local" id="b-start" min="${minStart}" value="${minStart}" required>
        </div>
        <div class="field">
          <label for="b-hours">Duration (hours)</label>
          <input type="number" id="b-hours" min="1" max="8" step="1" value="2" required>
        </div>
      </div>
      <div class="field">
        <label for="b-location">Meeting location</label>
        <input type="text" id="b-location" placeholder="e.g. Central Park entrance, 5th Ave" required>
      </div>
      <div class="field">
        <label for="b-notes">Notes (optional)</label>
        <textarea id="b-notes" placeholder="Anything ${escapeHtml(c.name.split(' ')[0])} should know"></textarea>
      </div>
      <div class="estimate">
        <div>
          <strong id="b-total">${money(c.rate * 2)}</strong>
          <small id="b-breakdown">${money(c.rate)}/hr &times; 2 hours</small>
        </div>
        <small>Charged after the meeting</small>
      </div>
      <label class="consent">
        <input type="checkbox" id="b-consent" required>
        <span>I understand bookings are platonic and I will respect the companion's boundaries and the community rules.</span>
      </label>
      <button type="submit" class="btn btn-primary btn-block">Confirm booking</button>
    </form>
  `;

  showModal();

  const hoursEl = $('#b-hours');
  hoursEl.addEventListener('input', () => updateEstimate(c));
  $('#booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitBooking(c);
  });
}

function updateEstimate(c) {
  const hours = Math.max(1, parseInt($('#b-hours').value, 10) || 1);
  $('#b-total').textContent = money(c.rate * hours);
  $('#b-breakdown').textContent = `${money(c.rate)}/hr × ${hours} hour${hours > 1 ? 's' : ''}`;
}

function submitBooking(c) {
  const start = $('#b-start').value;
  const hours = Math.max(1, parseInt($('#b-hours').value, 10) || 1);
  const activity = $('#b-activity').value;
  const location = $('#b-location').value.trim();
  const notes = $('#b-notes').value.trim();

  if (!start || !location) return;

  const booking = {
    id: 'b_' + Date.now(),
    companionId: c.id,
    companionName: c.name,
    city: c.city,
    start, hours,
    activity, location, notes,
    total: c.rate * hours,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  const all = loadBookings();
  all.unshift(booking);
  saveBookings(all);

  showConfirmation(booking, c);
  renderBookings();
}

function showConfirmation(b, c) {
  $('#modal-body').innerHTML = `
    <div class="confirmation">
      <div class="checkmark">&#10003;</div>
      <h3>You're booked with ${escapeHtml(c.name.split(' ')[0])}!</h3>
      <p class="muted">${fmtDate(b.start)} &middot; ${b.hours} hour${b.hours > 1 ? 's' : ''} &middot; ${money(b.total)}</p>
      <p class="muted" style="margin-top:1rem">We'll send you a reminder and let ${escapeHtml(c.name.split(' ')[0])} know.</p>
      <button class="btn btn-primary" data-close="1" style="margin-top:1.5rem">Done</button>
    </div>
  `;
}

// ---------- Bookings list ----------
function renderBookings() {
  const list = loadBookings();
  const wrap = $('#bookings-list');
  const empty = $('#bookings-empty');

  if (!list.length) {
    wrap.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  wrap.innerHTML = list.map(b => `
    <div class="booking">
      <div class="booking-info">
        <h4>${escapeHtml(b.companionName)} &middot; ${escapeHtml(b.activity)}</h4>
        <p>${fmtDate(b.start)} &middot; ${b.hours}h &middot; ${escapeHtml(b.location)} &middot; ${money(b.total)}</p>
      </div>
      <span class="booking-status ${b.status === 'cancelled' ? 'cancelled' : ''}">${b.status}</span>
      ${b.status === 'cancelled'
        ? `<button class="btn-icon" data-remove="${b.id}">Remove</button>`
        : `<button class="btn-icon" data-cancel="${b.id}">Cancel</button>`}
    </div>
  `).join('');
}

function cancelBooking(id) {
  const all = loadBookings().map(b => b.id === id ? { ...b, status: 'cancelled' } : b);
  saveBookings(all);
  renderBookings();
}
function removeBooking(id) {
  saveBookings(loadBookings().filter(b => b.id !== id));
  renderBookings();
}

// ---------- Modal helpers ----------
function showModal() { $('#modal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function hideModal() { $('#modal').classList.add('hidden'); document.body.style.overflow = ''; }

function nextHourLocalISO() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- Wire up ----------
function init() {
  populateFilters();
  renderGrid();
  renderBookings();

  $('#stat-companions').textContent = COMPANIONS.length;
  $('#stat-cities').textContent = unique(COMPANIONS.map(c => c.city)).length;
  $('#year').textContent = new Date().getFullYear();

  // Filters
  $('#f-city').addEventListener('change', e => { state.filters.city = e.target.value; renderGrid(); });
  $('#f-interest').addEventListener('change', e => { state.filters.interest = e.target.value; renderGrid(); });
  $('#f-rate').addEventListener('input', e => {
    state.filters.maxRate = parseInt(e.target.value, 10);
    $('#f-rate-val').textContent = '$' + e.target.value;
    renderGrid();
  });
  $('#f-search').addEventListener('input', e => { state.filters.search = e.target.value; renderGrid(); });
  $('#f-reset').addEventListener('click', () => {
    state.filters = { city: '', interest: '', maxRate: 300, search: '' };
    $('#f-city').value = '';
    $('#f-interest').value = '';
    $('#f-rate').value = 300;
    $('#f-rate-val').textContent = '$300';
    $('#f-search').value = '';
    renderGrid();
  });

  // Card "Book" buttons (event delegation)
  $('#companion-grid').addEventListener('click', e => {
    const btn = e.target.closest('[data-book]');
    if (btn) openBooking(btn.dataset.book);
  });

  // Bookings list actions
  $('#bookings-list').addEventListener('click', e => {
    const c = e.target.closest('[data-cancel]');
    const r = e.target.closest('[data-remove]');
    if (c) cancelBooking(c.dataset.cancel);
    if (r) removeBooking(r.dataset.remove);
  });

  // Modal close
  $('#modal').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) hideModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
