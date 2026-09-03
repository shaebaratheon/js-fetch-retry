# js-fetch-retry

A lightweight, dependency-free wrapper around the native `fetch` API to support automatic retries with exponential backoff.

## Installation
Just copy `index.js` into your project.

## Usage
```javascript
const { fetchWithRetry } = require('./index');

fetchWithRetry('https://api.example.com/data', {
    retries: 3,
    delay: 500
}).then(res => res.json())
  .then(console.log);
```
# Fresh Comment : Wed Sep  2 05:43:29 AM UTC 2026
# Fresh Comment : Wed Sep  2 05:43:37 AM UTC 2026
