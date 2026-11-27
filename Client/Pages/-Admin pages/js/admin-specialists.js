import { supabase } from "./js/supabase-client.js";

(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const SPECIALTIES = [
    'General surgery',
    'Orthopaedics',
    'ENT',
    'Gynaecology',
    'Paediatrics',
    'Urology',
    'Ophthalmology',
    'Neurosurgery',
    'Cardiothoracic surgery',
    'Plastic surgery',
    'Other'
  ];

  let specialists = [];

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);

  const initials = name =>
    String(name ?? '')
      .split(/\s+/)
      .filter(part => !['Dr.', 'Dr'].includes(part))
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();

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

  function setupSpecialtyOptions() {
    const options = SPECIALTIES.map(specialty =>
      `<option value="${escapeHTML(specialty)}">${escapeHTML(specialty)}</option>`
    ).join('');

    $('newSpecialty').innerHTML = options;
  }

  function updateSpecialtyFilter() {
    const specialties = [
      ...new Set(
        specialists
          .map(person => person.specialty)
          .filter(Boolean)
      )
    ].sort();

    $('filterSpecialty').innerHTML = `
      <option value="">All specialties</option>
      ${specialties.map(specialty =>
        `<option value="${escapeHTML(specialty)}">${escapeHTML(specialty)}</option>`
      ).join('')}
    `;
  }

  function render() {
    const search = $('searchSpecialists').value.trim().toLowerCase();
    const specialty = $('filterSpecialty').value;

    const results = specialists.filter(person => {
      const matchesText = [
        person.full_name,
        person.specialty,
        person.id
      ].some(value =>
        String(value ?? '').toLowerCase().includes(search)
      );

      return matchesText &&
        (!specialty || person.specialty === specialty);
    });

    $('totalCount').textContent = specialists.length;

    // Availability is not yet stored in the database.
    $('onDutyCount').textContent = '—';
    $('unavailableCount').textContent = '—';

    $('resultCount').textContent =
      `${results.length} specialists`;

    $('emptyDirectory').hidden = results.length > 0;

    $('specialistRows').innerHTML = results.map(person => `
      <tr>
        <td>
          <div class="asp-person">
            <span class="asp-avatar">
              ${escapeHTML(initials(person.full_name))}
            </span>

            <span>
              <strong>${escapeHTML(person.full_name)}</strong>
              <small>${escapeHTML(person.id)}</small>
            </span>
          </div>
        </td>

        <td>${escapeHTML(person.specialty || 'Not specified')}</td>

        <td>
          <span class="asp-status away">Not set</span>
        </td>

        <td>
          ${person.user_id ? 'Linked account' : 'No linked account'}
        </td>

        <td>
          <a class="asp-row-link"
             href="admin-specialist-profile.html?id=${encodeURIComponent(person.id)}">
            Open profile →
          </a>
        </td>
      </tr>
    `).join('');
  }

  async function loadSpecialists() {
    $('specialistRows').innerHTML = `
      <tr>
        <td colspan="5">Loading specialists...</td>
      </tr>
    `;

    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.replace('./admin-login.html');
        return;
      }

      const response = await fetch('/api/specialists', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        window.location.replace('./admin-login.html');
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Could not retrieve specialists (${response.status}).`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('The specialists response was not valid.');
      }

      specialists = data;

      updateSpecialtyFilter();
      render();

    } catch (error) {
      console.error('Unable to load specialists:', error);

      $('specialistRows').innerHTML = `
        <tr>
          <td colspan="5">
            Unable to load specialists. Please refresh and try again.
          </td>
        </tr>
      `;

      $('totalCount').textContent = '—';
      $('onDutyCount').textContent = '—';
      $('unavailableCount').textContent = '—';
      $('resultCount').textContent = 'Unavailable';
    }
  }

  setupNavigation();
  setupSpecialtyOptions();

  // Adding specialists will be connected to the backend separately.
  $('addSpecialist').disabled = true;
  $('addSpecialist').title =
    'Specialist registration will be enabled after backend integration.';

  $('searchSpecialists').addEventListener('input', render);
  $('filterSpecialty').addEventListener('change', render);

  loadSpecialists();

})();
 