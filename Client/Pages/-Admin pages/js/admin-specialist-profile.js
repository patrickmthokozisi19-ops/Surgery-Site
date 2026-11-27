
(() => {
  'use strict';

  const STORE_KEY = 'pweb-specialists-v1';
  const SPECIALTIES = ['General surgery', 'Orthopaedics', 'ENT', 'Gynaecology', 'Paediatrics', 'Urology', 'Ophthalmology', 'Neurosurgery', 'Cardiothoracic surgery', 'Plastic surgery', 'Other'];
  const DEFAULTS = [
    { id: 'SP-1001', name: 'Dr. P. Surname', specialty: 'General surgery', email: 'psurname@example.invalid', phone: '000 000 0000', registration: '', status: 'On duty', credential: 'Not verified', account: 'Not invited', duration: 45, notes: '', hours: { Mon: ['08:00', '16:00'], Tue: ['08:00', '16:00'], Wed: ['08:00', '16:00'], Thu: ['08:00', '16:00'], Fri: ['08:00', '13:00'], Sat: null, Sun: null } },
    { id: 'SP-1002', name: 'Dr. N. Maseko', specialty: 'Orthopaedics', email: 'nmaseko@example.invalid', phone: '000 000 0000', registration: '', status: 'On duty', credential: 'Not verified', account: 'Not invited', duration: 30, notes: '', hours: { Mon: ['09:00', '17:00'], Tue: ['09:00', '17:00'], Wed: null, Thu: ['09:00', '17:00'], Fri: ['09:00', '15:00'], Sat: null, Sun: null } },
    { id: 'SP-1003', name: 'Dr. K. Lewis', specialty: 'ENT', email: 'klewis@example.invalid', phone: '000 000 0000', registration: '', status: 'In theatre', credential: 'Not verified', account: 'Not invited', duration: 30, notes: '', hours: { Mon: ['08:00', '15:00'], Tue: ['08:00', '15:00'], Wed: ['08:00', '15:00'], Thu: null, Fri: ['08:00', '15:00'], Sat: null, Sun: null } }
  ];
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const initials = name => name.split(/\s+/).filter(part => !['Dr.', 'Dr'].includes(part)).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  function loadSpecialists() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return Array.isArray(saved) ? saved : structuredClone(DEFAULTS);
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  let specialists = loadSpecialists();

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(specialists));
      return true;
    } catch {
      return false;
    }
  }

  function setupNavigation() {
    const nav = $('dw-nav-links');
    const button = document.querySelector('.adm-doc-nav .burger');
    if (!nav || !button) return;
    button.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      button.classList.toggle('open', open);
      document.querySelector('.adm-doc-nav').classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  }

  setupNavigation();
  const id = new URLSearchParams(window.location.search).get('id');
  let specialist = specialists.find(person => person.id === id);
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const LONG_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (!specialist) {
    $('profileMessage').textContent = 'Specialist not found. Return to the directory and select a profile.';
    $('saveProfile').disabled = true;
    return;
  }

  $('profileContent').hidden = false;
  $('specialistNumber').textContent = '· ' + specialist.id;
  $('profileName').textContent = specialist.name;
  $('profileSpecialty').textContent = specialist.specialty;
  $('editSpecialty').innerHTML = SPECIALTIES.map(item => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join('');

  function fillForm() {
    $('editName').value = specialist.name;
    $('editSpecialty').value = specialist.specialty;
    $('editEmail').value = specialist.email;
    $('editPhone').value = specialist.phone;
    $('editRegistration').value = specialist.registration;
    $('editStatus').value = specialist.status;
    $('editNotes').value = specialist.notes || '';
    $('editDuration').value = specialist.duration || 30;
    $('credentialStatus').textContent = specialist.credential || 'Not verified';
    $('accountStatus').textContent = specialist.account || 'Not invited';
    $('accountDescription').textContent = specialist.account === 'Active' ? 'Workspace account is active.' : 'No active doctor account is connected to this profile.';
    $('hoursRows').innerHTML = DAYS.map((day, index) => {
      const range = specialist.hours?.[day];
      return `
        <div class="asp-hours-row" data-day="${day}">
          <label class="asp-day-check"><input type="checkbox" class="asp-working" ${range ? 'checked' : ''}><span>${LONG_DAYS[index]}</span></label>
          <label>From <input type="time" class="asp-from" value="${range?.[0] || '09:00'}" ${range ? '' : 'disabled'}></label>
          <label>To <input type="time" class="asp-to" value="${range?.[1] || '17:00'}" ${range ? '' : 'disabled'}></label>
        </div>
      `;
    }).join('');
  }

  $('hoursRows').addEventListener('change', event => {
    if (!event.target.matches('.asp-working')) return;
    const row = event.target.closest('.asp-hours-row');
    row.querySelectorAll('input[type="time"]').forEach(input => { input.disabled = !event.target.checked; });
  });

  document.querySelectorAll('.asp-tab').forEach(button => {
    button.addEventListener('click', () => {
      const selected = button.dataset.tab;
      document.querySelectorAll('.asp-tab').forEach(tab => {
        const active = tab === button;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.asp-tab-panel').forEach(panel => {
        panel.hidden = panel.id !== 'tab-' + selected;
      });
    });
  });

  $('viewCalendar').href = 'admin-calendar.html';
  $('inviteButton').addEventListener('click', () => {
    $('profileMessage').textContent = 'Account invitations are not available yet.';
  });

  function saveProfile(event) {
    if (event) event.preventDefault();
    $('profileMessage').textContent = '';
    const name = $('editName').value.trim();
    const email = $('editEmail').value.trim();
    if (!name || !$('editEmail').validity.valid) {
      $('profileMessage').textContent = 'Enter a valid name and email address.';
      return;
    }
    if (email && specialists.some(person => person.id !== specialist.id && person.email.toLowerCase() === email.toLowerCase())) {
      $('profileMessage').textContent = 'Another specialist already uses this email address.';
      return;
    }
    const hours = {};
    for (const row of document.querySelectorAll('.asp-hours-row')) {
      const day = row.dataset.day;
      const working = row.querySelector('.asp-working').checked;
      const start = row.querySelector('.asp-from').value;
      const end = row.querySelector('.asp-to').value;
      if (working && (!start || !end || start >= end)) {
        $('profileMessage').textContent = `Check the working hours for ${day}. The end time must be after the start time.`;
        document.querySelector('[data-tab="availability"]').click();
        return;
      }
      hours[day] = working ? [start, end] : null;
    }
    const updated = {
      ...specialist,
      name,
      specialty: $('editSpecialty').value,
      email,
      phone: $('editPhone').value.trim(),
      registration: $('editRegistration').value.trim(),
      status: $('editStatus').value,
      notes: $('editNotes').value.trim(),
      duration: Number($('editDuration').value),
      hours
    };
    const previous = specialists;
    specialists = specialists.map(person => person.id === id ? updated : person);
    if (!persist()) {
      specialists = previous;
      $('profileMessage').textContent = 'Unable to save changes in this browser.';
      return;
    }
    specialist = updated;
    $('profileName').textContent = updated.name;
    $('profileSpecialty').textContent = updated.specialty;
    $('viewCalendar').href = 'admin-calendar.html';
    $('profileMessage').textContent = 'Specialist profile saved.';
  }

  $('saveProfile').addEventListener('click', saveProfile);
  $('profileForm').addEventListener('submit', saveProfile);
  fillForm();
})();
 