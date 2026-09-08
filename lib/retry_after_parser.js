'use strict';

function parseRetryAfter(headerValue, now = Date.now()) {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }
  const trimmed = headerValue.trim();
  // Check if pure integer seconds
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return seconds >= 0 ? seconds * 1000 : null;
  }
  // Try HTTP Date
  const parsedTime = Date.parse(trimmed);
  if (!isNaN(parsedTime)) {
    const delay = parsedTime - now;
    return delay > 0 ? delay : 0;
  }
  return null;
}

module.exports = { parseRetryAfter };
