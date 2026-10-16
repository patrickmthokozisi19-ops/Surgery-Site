Pweb

Pweb is a multi-tenant platform for hospitals and surgical practices. This repository (Surgery-Site) holds the front end: a public marketing homepage, a specialist profile page and a logged-in client dashboard. It is plain HTML and CSS with native CSS nesting and a small amount of vanilla JavaScript. There is no build step.

Pages
Page	Purpose
index.html	Public homepage: hero, carousel, overview, solutions, how it works, product preview, call to action, footer
specialist.html	Specialist home page: profile, key figures, areas of practice, care pathway, credentials, consulting rooms, booking
dashboard.html	Client dashboard after login: appointments, actions, messages, billing, documents

All pages share one header and one footer, built from the same class names.

Running it locally

Open index.html in a browser, or serve the folder with any static server:

bash
npx serve .

The project can also be previewed live in StackBlitz by importing the repository.

Project structure

Adjust this to match your folders.

Surgery-Site/
├── index.html
├── specialist.html
├── dashboard.html
├── style.css          all styles, organised in cascade layers
├── script.js          navigation and carousel behaviour
├── assets/
│   ├── logo.png
│   ├── icons/
│   └── images/
└── README.md
CSS architecture

All styling lives in one stylesheet and is split into cascade layers. Later layers win over earlier ones regardless of selector specificity, so sections never fight each other.

css
@layer Global, Content1, About, ClientDashboard, Specialist;
Layer	Contents
Global	Design tokens, reset, header (.nav), shared section kit (buttons, cards, steps, call to action), footer
Content1	Marketing homepage sections: .band, .ph, hero stage, carousel, overview, solutions, how it works, preview
About	Hero slideshow and the about-us section
ClientDashboard	Everything prefixed .dash
Specialist	Everything prefixed .sp-
Conventions
Nesting: each section is written as one single nested block under one parent selector. Media queries and pseudo-elements go inside that block, never as separate top-level rules.
Layout: pages sit on the .wrapper grid (1fr 90% 1fr). Content goes in the middle column. Bands use subgrid and an inner .band-inner in column 2.
Tokens: colours, radii, shadows and easing are CSS custom properties on :root (--ink, --brand, --accent, --surface, --radius, and so on). Use these instead of hard-coded values so the public pages and the logged-in pages keep the same palette.
Header: never restyle the header per page. Reuse .nav, .tNav, .bNav, .logoNbackBtn, .bnavLinks, .navBtn, .burger and .is-current.
Class prefixes: pw- for marketing sections, dash- for the dashboard, sp- for the specialist page.
Motion: transitions are short and respond to user action. Animations are disabled under prefers-reduced-motion: reduce.
Adding a new page or section
Add a new layer name to the end of the @layer order line.
Create @layer YourLayer { ... } at the end of the stylesheet.
Reuse existing kit classes (.band, .card, .btn, .steps, .cta-band) before writing new CSS.
Write only the CSS the kit does not cover, as one nested block per section.
Use the shared header and footer markup unchanged.
Accessibility
Skip link to #main on every page.
Visible focus outline on all interactive elements.
Landmarks and aria-labelledby on each section.
Mobile navigation toggles aria-expanded on the burger button.
Layouts respond down to small phone widths.
Placeholder content

The specialist page ships with placeholder copy: name, registration number, figures, hospitals, hours, address and contact details. Search for Dr. Full Name, MP 0000000, 000 000 0000 and rooms@example.com and replace them before publishing. Image placeholders use the .ph class. Drop an <img> inside it and the dashed placeholder switches to a solid image frame automatically.

Status

Work in progress. The homepage and dashboard are structured and styled. The specialist page is the newest addition.
