// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

function formatMoney(n) {
  if (n >= 1_000_000) {
    return '$' + (n / 1_000_000).toFixed(2) + 'M';
  }
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ---- Compound Interest Calculator ----

let ciChart = null;

function calculateCompound() {
  const initial = parseFloat(document.getElementById('ci-initial').value) || 0;
  const monthly = parseFloat(document.getElementById('ci-monthly').value) || 0;
  const rate = (parseFloat(document.getElementById('ci-rate').value) || 0) / 100;
  const years = parseInt(document.getElementById('ci-years').value) || 1;

  const monthlyRate = rate / 12;
  const labels = [];
  const balances = [];
  const contributions = [];

  let balance = initial;
  let totalContributed = initial;

  labels.push('Start');
  balances.push(balance);
  contributions.push(totalContributed);

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      totalContributed += monthly;
    }
    labels.push('Year ' + y);
    balances.push(Math.round(balance));
    contributions.push(Math.round(totalContributed));
  }

  const futureValue = Math.round(balance);
  const interestEarned = futureValue - Math.round(totalContributed);

  document.getElementById('ci-future').textContent = formatMoney(futureValue);
  document.getElementById('ci-contributed').textContent = formatMoney(Math.round(totalContributed));
  document.getElementById('ci-interest').textContent = formatMoney(interestEarned);

  // Milestones
  const milestoneTargets = [100000, 250000, 500000, 1000000, 2000000, 5000000];
  let milestoneHTML = '<h3>Wealth Milestones</h3>';
  let bal = initial;
  let found = 0;

  for (let y = 1; y <= years && found < milestoneTargets.length; y++) {
    for (let m = 0; m < 12; m++) {
      bal = bal * (1 + monthlyRate) + monthly;
    }
    while (found < milestoneTargets.length && bal >= milestoneTargets[found]) {
      milestoneHTML += `<div class="milestone">
        <span class="milestone-amount">${formatMoney(milestoneTargets[found])}</span>
        <span class="milestone-year">Year ${y}</span>
      </div>`;
      found++;
    }
  }

  if (found === 0) {
    milestoneHTML += '<p style="color: var(--text-muted);">Increase contributions or time to hit milestones.</p>';
  }

  document.getElementById('ci-milestones').innerHTML = milestoneHTML;

  // Chart
  const ctx = document.getElementById('ci-chart').getContext('2d');
  if (ciChart) ciChart.destroy();

  ciChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Interest Earned',
          data: balances.map((b, i) => b - contributions[i]),
          backgroundColor: 'rgba(0, 200, 83, 0.6)',
          borderRadius: 4,
        },
        {
          label: 'Contributions',
          data: contributions,
          backgroundColor: 'rgba(88, 166, 255, 0.4)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8b949e' } },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.raw),
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#8b949e' },
          grid: { color: '#30363d' },
        },
        y: {
          stacked: true,
          ticks: { color: '#8b949e', callback: v => formatMoney(v) },
          grid: { color: '#30363d' },
        },
      },
    },
  });

  document.getElementById('ci-results').classList.remove('hidden');
}

// ---- FIRE Calculator ----

let fireChart = null;

function calculateFIRE() {
  const income = parseFloat(document.getElementById('fire-income').value) || 0;
  const expenses = parseFloat(document.getElementById('fire-expenses').value) || 0;
  const saved = parseFloat(document.getElementById('fire-saved').value) || 0;
  const returnRate = (parseFloat(document.getElementById('fire-return').value) || 0) / 100;
  const withdrawRate = (parseFloat(document.getElementById('fire-withdraw').value) || 4) / 100;

  const fireNumber = Math.round(expenses / withdrawRate);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const annualSavings = income - expenses;

  // Simulate year by year
  let balance = saved;
  let yearsToFire = 0;
  const labels = ['Now'];
  const balances = [balance];
  const fireLine = [fireNumber];

  while (balance < fireNumber && yearsToFire < 100) {
    balance = balance * (1 + returnRate) + annualSavings;
    yearsToFire++;
    labels.push('Year ' + yearsToFire);
    balances.push(Math.round(balance));
    fireLine.push(fireNumber);
  }

  if (yearsToFire >= 100) {
    yearsToFire = 'N/A';
  }

  document.getElementById('fire-number').textContent = formatMoney(fireNumber);
  document.getElementById('fire-years').textContent = typeof yearsToFire === 'number' ? yearsToFire + ' years' : yearsToFire;
  document.getElementById('fire-rate').textContent = savingsRate.toFixed(1) + '%';

  // Chart
  const ctx = document.getElementById('fire-chart').getContext('2d');
  if (fireChart) fireChart.destroy();

  fireChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Portfolio Value',
          data: balances,
          borderColor: '#00c853',
          backgroundColor: 'rgba(0,200,83,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: 'FIRE Number',
          data: fireLine,
          borderColor: '#ffd600',
          borderDash: [8, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8b949e' } },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.raw),
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#8b949e' },
          grid: { color: '#30363d' },
        },
        y: {
          ticks: { color: '#8b949e', callback: v => formatMoney(v) },
          grid: { color: '#30363d' },
        },
      },
    },
  });

  document.getElementById('fire-results').classList.remove('hidden');
}

// ---- Side Hustle Planner ----

let hustleChart = null;

function addHustle() {
  const list = document.getElementById('hustle-list');
  const row = document.createElement('div');
  row.className = 'hustle-row';
  row.innerHTML = `
    <input type="text" placeholder="Hustle name" class="hustle-name">
    <input type="number" placeholder="$/month" class="hustle-income" value="0" min="0" step="50">
    <input type="number" placeholder="hrs/week" class="hustle-hours" value="0" min="0" step="1">
    <button class="btn-remove" onclick="removeHustle(this)" title="Remove">&times;</button>
  `;
  list.appendChild(row);
}

function removeHustle(btn) {
  const list = document.getElementById('hustle-list');
  if (list.children.length > 1) {
    btn.parentElement.remove();
  }
}

function calculateHustle() {
  const rows = document.querySelectorAll('.hustle-row');
  let totalMonthly = 0;
  let totalHours = 0;

  rows.forEach(row => {
    const income = parseFloat(row.querySelector('.hustle-income').value) || 0;
    const hours = parseFloat(row.querySelector('.hustle-hours').value) || 0;
    totalMonthly += income;
    totalHours += hours;
  });

  const investPct = (parseFloat(document.getElementById('hustle-invest-pct').value) || 0) / 100;
  const returnRate = (parseFloat(document.getElementById('hustle-return').value) || 0) / 100;
  const years = parseInt(document.getElementById('hustle-years').value) || 1;

  const monthlyInvested = totalMonthly * investPct;
  const monthlyRate = returnRate / 12;
  const effectiveHourly = totalHours > 0 ? totalMonthly / (totalHours * 4.33) : 0;

  // Simulate growth
  let balance = 0;
  let totalPutIn = 0;
  const labels = ['Start'];
  const balances = [0];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyInvested;
      totalPutIn += monthlyInvested;
    }
    labels.push('Year ' + y);
    balances.push(Math.round(balance));
  }

  const totalEarned = totalMonthly * 12 * years;

  document.getElementById('hustle-monthly').textContent = formatMoney(totalMonthly);
  document.getElementById('hustle-hourly').textContent = '$' + effectiveHourly.toFixed(2) + '/hr';
  document.getElementById('hustle-growth').textContent = formatMoney(Math.round(balance));
  document.getElementById('hustle-total').textContent = formatMoney(Math.round(totalEarned));

  // Chart
  const ctx = document.getElementById('hustle-chart').getContext('2d');
  if (hustleChart) hustleChart.destroy();

  hustleChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Invested Hustle Income',
          data: balances,
          borderColor: '#00c853',
          backgroundColor: 'rgba(0,200,83,0.15)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8b949e' } },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + formatMoney(ctx.raw),
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#8b949e' },
          grid: { color: '#30363d' },
        },
        y: {
          ticks: { color: '#8b949e', callback: v => formatMoney(v) },
          grid: { color: '#30363d' },
        },
      },
    },
  });

  document.getElementById('hustle-results').classList.remove('hidden');
}

// Run compound calculator on load
calculateCompound();
