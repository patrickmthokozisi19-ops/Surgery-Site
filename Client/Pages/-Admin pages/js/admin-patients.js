
(() => {
  'use strict';

  let patients = [];

  const API_URL = '/api/patients';

  const get = (id) => document.getElementById(id);


const registrationForm = get('registerForm');
const registrationPages = [
...registrationForm.querySelectorAll('.ap-reg-page')
];

const previousRegPage = get('previousRegPage');
const nextRegPage = get('nextRegPage');
const submitRegistration = get('submitRegistration');
const registrationReview = get('registrationReview');

let currentRegPage = 1;
function setupConditionalFields() {
const toggles = [
['kinEnabled', 'kinFields'],
['guardianEnabled', 'guardianFields']
];

toggles.forEach(([toggleId, fieldsId]) => {
const toggle = get(toggleId);
const fields = get(fieldsId);

const update = () => {
  fields.hidden = !toggle.checked;

  if (!toggle.checked) {
    fields.querySelectorAll('input, select, textarea').forEach((field) => {
      field.value = '';
    });
  }
};

toggle.addEventListener('change', update);
update();
});

const paymentMethod = get('paymentMethod');
const medicalAidFields = get('medicalAidFields');

function updatePaymentFields() {
const isMedicalAid = paymentMethod.value === 'medical_aid';

medicalAidFields.hidden = !isMedicalAid;

if (!isMedicalAid) {
  medicalAidFields.querySelectorAll('input, textarea').forEach((field) => {
    field.value = '';
  });
}
}

paymentMethod.addEventListener('change', updatePaymentFields);
updatePaymentFields();
}
document.getElementById('cancelRegister')?.addEventListener('click', () => {
const form = document.getElementById('patientRegistrationForm');

if (!form) return;

form.reset();

// Hide conditional fields
['medicalAidFields', 'kinFields', 'guardianFields'].forEach(id => {
const section = document.getElementById(id);
if (section) section.hidden = true;
});

// Return to the first registration step
const pages = document.querySelectorAll('.ap-reg-page');

pages.forEach((page, index) => {
page.classList.toggle('active', index === 0);
page.hidden = index !== 0;
});
});
setupConditionalFields();
function updateRegistrationPage() {
registrationPages.forEach((page, index) => {
const isCurrent = index + 1 === currentRegPage;

page.hidden = !isCurrent;
page.classList.toggle('active', isCurrent);
});

document.querySelectorAll(
'#registerDialog .ap-reg-progress-step'
).forEach((step) => {
const stepNumber = Number(step.dataset.step);

step.classList.toggle('active', stepNumber === currentRegPage);
step.classList.toggle('completed', stepNumber < currentRegPage);
});

previousRegPage.hidden = currentRegPage === 1;
nextRegPage.hidden = currentRegPage === registrationPages.length;
submitRegistration.hidden = currentRegPage !== registrationPages.length;
}

function validateCurrentRegPage() {
const currentPage = registrationPages[currentRegPage - 1];

const fields = currentPage.querySelectorAll(
'input:not([type="checkbox"]):not([type="radio"]), select, textarea'
);

for (const field of fields) {
if (!field.checkValidity()) {
  field.reportValidity();
  return false;
}
}

return true;
}


function buildRegistrationReview() {
registrationReview.replaceChildren();

const heading = document.createElement('h3');
heading.textContent = 'Review registration details';

const description = document.createElement('p');
description.textContent =
'Please check the information below before creating the patient record.';

registrationReview.append(heading, description);

registrationPages.forEach((page) => {
const fields = page.querySelectorAll(
  'input, select, textarea'
);

const group = document.createElement('section');
group.className = 'ap-reg-review-group';

const groupHeading = document.createElement('h4');
groupHeading.textContent =
  page.querySelector('h3')?.textContent.trim() || 'Additional details';

const details = document.createElement('dl');
let hasDetails = false;

fields.forEach((field) => {
  if (field.disabled || !field.name) return;

  if (field.type === 'radio' && !field.checked) return;

  const label = field.labels?.[0]?.textContent
.replace(/\s+/g, ' ')
.trim() || field.name;

  let value = '';

  if (field.type === 'checkbox') {
    value = field.checked ? 'Yes' : 'No';
  } else if (field.tagName === 'SELECT') {
value = field.selectedOptions[0]?.textContent
.replace(/\s+/g, ' ')
.trim() || '';
} else {
    value = field.value.trim();
  }

  if (!value && field.type !== 'checkbox') return;

  const row = document.createElement('div');
  row.className = 'ap-reg-review-row';

  const term = document.createElement('dt');
  term.textContent = label;

  const definition = document.createElement('dd');
  definition.textContent = value || 'Not provided';

  row.append(term, definition);
  details.appendChild(row);

  hasDetails = true;
});

if (hasDetails) {
  group.append(groupHeading, details);
  registrationReview.appendChild(group);
}
});
}

nextRegPage.addEventListener('click', () => {
if (!validateCurrentRegPage()) return;

if (currentRegPage < registrationPages.length) {
currentRegPage++;
updateRegistrationPage();

if (currentRegPage === registrationPages.length) {
  buildRegistrationReview();
}
}
});

previousRegPage.addEventListener('click', () => {
if (currentRegPage > 1) {
currentRegPage--;
updateRegistrationPage();
}
});

function resetRegistrationPages() {
currentRegPage = 1;
updateRegistrationPage();
}

updateRegistrationPage();


  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  async function loadPatients() {
try {
    const { supabase } = await import('./supabase-client.js');
const {
  data: { session },
  error: sessionError
} = await supabase.auth.getSession();

if (sessionError || !session) {
  window.location.replace('./admin-login.html');
  return;
}

const response = await fetch(API_URL, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});

if (!response.ok) {
  throw new Error('Unable to retrieve patients.');
}

const data = await response.json();

patients = data.map((patient) => {
  const details = patient.details || {};

  const name = patient.full_name || 'Unnamed patient';

  const status = patient.status === 'active'
    ? 'Active'
    : 'Inactive';

  const verificationMap = {
    verified: 'Verified',
    pending_review: 'Pending review',
    not_uploaded: 'Not uploaded'
  };

  return {
    id: patient.id,
    name,
    initials: name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    phone: patient.contact || '',
    email: details.patientEmail || '',
    dob: details.birthDate || '',
    registered: patient.created_at || '',
    verification: verificationMap[patient.verification_status]
      || 'Not uploaded',
    status,
    emergencyName: details.emergencyName || '',
    emergencyPhone: details.emergencyPhone || ''
  };
});

renderPatients();

} catch (error) {
console.error('Patient directory loading failed:', error);
}
}

  function badge(value) {
    const name = value === 'Verified' ? 'verified' :
      value === 'Pending review' ? 'pending' :
        value === 'Active' ? 'active' : 'neutral';
    return `<span class="ap-badge ${name}">${safe(value)}</span>`;
  }

  function renderPatients() {
    const query = get('patientSearch').value.trim().toLowerCase();
    const status = get('statusFilter').value;
    const documents = get('documentFilter').value;
    const visible = patients.filter((patient) => {
      const searchText = [patient.name, patient.id, patient.phone, patient.email]
        .join(' ').toLowerCase();
      return searchText.includes(query) &&
        (status === 'all' || patient.status === status) &&
        (documents === 'all' || patient.verification === documents);
    });

    get('patientRows').innerHTML = visible.map((patient) => `
    <tr>
      <td>
        <div class="ap-person">
          <span class="ap-avatar">${safe(patient.initials)}</span>
          <strong>${safe(patient.name)}</strong>
        </div>
      </td>
      <td class="ap-number">${safe(patient.id)}</td>
      <td><span class="ap-contact">${safe(patient.phone)}</span></td>
      <td>${badge(patient.verification)}</td>
      <td>${badge(patient.status)}</td>
      <td><a class="ap-record-link" href="admin-patient-record.html?id=${encodeURIComponent(patient.id)}">Open record →</a></td>
    </tr>
  `).join('');

    get('resultCount').textContent = `${visible.length} records`;
    get('emptyResults').hidden = visible.length !== 0;
    get('totalPatients').textContent = patients.length;
    get('activePatients').textContent = patients.filter((p) => p.status === 'Active').length;
    get('pendingPatients').textContent = patients.filter((p) => p.verification === 'Pending review').length;
  }

  ['patientSearch', 'statusFilter', 'documentFilter'].forEach((id) => {
    get(id).addEventListener(id === 'patientSearch' ? 'input' : 'change', renderPatients);
  });

  const dialog = get('registerDialog');
  get('addPatient').addEventListener('click', () => dialog.showModal());
  get('closeRegister').addEventListener('click', () => dialog.close());
  get('cancelRegister').addEventListener('click', () => dialog.close());

  get('registerForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name')).trim();
    const phone = String(values.get('phone')).trim();
    if (!name || !phone) return;

    const maxNumber = Math.max(1000, ...patients.map((p) => Number(p.id.split('-')[1]) || 0));
    const patient = {
      id: `PT-${maxNumber + 1}`,
      name,
      initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      phone,
      email: String(values.get('email') || '').trim(),
      dob: String(values.get('dob') || ''),
      registered: new Date().toISOString().slice(0, 10),
      verification: 'Not uploaded',
      status: 'Active',
      emergencyName: '',
      emergencyPhone: ''
    };
    patients.push(patient);
    persist();
    dialog.close();
    window.location.href = `admin-patient-record.html?id=${encodeURIComponent(patient.id)}`;
  });

  const menuButton = document.querySelector('.adm-doc-nav .burger');
  const menuLinks = document.getElementById('dw-nav-links');

  if (menuButton && menuLinks) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuLinks.classList.toggle('open');
      menuButton.classList.toggle('open', isOpen);
      document.querySelector('.adm-doc-nav').classList.toggle('open', isOpen);
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
  }

  loadPatients();
    })();
