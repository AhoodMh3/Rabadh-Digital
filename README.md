# Al-Rabadh Castle | قلعة الربض

**From Historic Heritage to a Secure Digital Future**  

From Historic Heritage to a Secure Digital Future

<img width="1331" height="592" alt="image" src="https://github.com/user-attachments/assets/450a2596-24e2-4a26-8f80-835fb1419c23" />


An interactive digital experience inspired by Al-Rabadh Castle in Jordan, combining cultural heritage, bilingual web technologies, and cybersecurity awareness.

Al-Rabadh Castle transforms cultural heritage into an educational digital experience. The website allows users to explore the castle through interactive sections while discovering digital resources, file integrity verification using SHA-256, link inspection, and cybersecurity awareness activities.

## Features

- **Digital Tour:** Explore the castle through a digital experience.
- **Digital Library:** Access educational content and references.
- **SHA-256 Verification:** Verify file integrity using SHA-256 hashes.
- **Link Inspection:** Explore link-checking features and security awareness.
- **Cybersecurity Awareness:** Learn about cybersecurity risks and safe practices.
- **Interactive Game:** *Save the Castle* educational game.
- **Bilingual Interface:** Arabic and English support with RTL/LTR layouts.

## Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- JSON
- Playwright

Built with core web technologies without external frontend libraries.

## Website Sections

| Section | Route |
|---|---|
| Home | `#/home` |
| Digital Tour | `#/tour` |
| Digital Library | `#/library` |
| SHA-256 Verification | `#/hash` |
| Link Inspection | `#/links` |
| Awareness Center | `#/awareness` |
| Save the Castle Game | `#/game` |
| About | `#/about` |

## Getting Started

### Run Locally

Open `index.html` in your browser. 

https://ahoodmh3.github.io/Rabadh-Digital

Alternatively, install the project dependencies and start the local server:

```bash
npm install
npm start
```

Open `http://localhost:8080` in your browser.

## Internationalization (i18n)

The project includes a centralized translation system for Arabic and English.

| File | Description |
|---|---|
| `translations/ar.json` | Arabic translations |
| `translations/en.json` | English translations |
| `translations/translations.bundle.js` | Bundled translations for `file://` compatibility |
| `js/i18n.js` | Central translation engine |
| `js/data/content.js` | Language-independent content and data |

The translation engine manages language selection, page direction (`RTL`/`LTR`), document metadata, and language persistence through `localStorage`.

To rebuild the translation bundle:

```bash
npm run build:translations
```

## Testing

Install the Playwright Chromium browser and run the test suite:

```bash
npm install
npx playwright install chromium
npm test
```
Project Structure

.
├── index.html
    ├── css/
    ├── js/
│       ├── i18n.js
│       └── data/
│           └── content.js
├── translations/
│   ├── ar.json
│   ├── en.json
│   └── translations.bundle.js
├── tests/
│   └── run-tests.mjs
├── tools/
│   └── build-translations.mjs
├── package.json
└── README.md

Note: The structure above highlights the main files.

Why Al-Rabadh Castle?

Cultural heritage deserves to be preserved, understood, and passed on to future generations. This project brings that idea into the digital world by connecting Jordan's heritage with technology and cybersecurity awareness.

Inspired by Jordan's heritage. Built for a safer digital future.
