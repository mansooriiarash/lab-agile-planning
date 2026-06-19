# lab-agile-planning

Static TOP Jira CSV Export importer and analytics prototype.

## Features

- Fixed import profile: **TOP Jira CSV Export**.
- Parses UTF-8 BOM Jira CSV exports with duplicate headers without overwriting repeated columns.
- Stores duplicate-column values as arrays in `rawJson` and normalizes fields for reporting.
- Builds snapshot analytics, one-click latest-vs-previous comparison, and Persian management reports.
- Exports the Persian report as Markdown or HTML from `public/index.html`.

## Development

```bash
npm install
npm test
```
