/**
 * Parse a duration string like '15m', '7d', '24h' into milliseconds.
 * @param {string} value - The duration string
 * @param {number} defaultMs - Default fallback value
 * @returns {number} Duration in milliseconds
 */
exports.parseDurationMs = (value, defaultMs) => {
  if (!value) return defaultMs;
  const normalized = value.trim().toLowerCase();
  const match = /^([0-9]+)(s|m|h|d)$/.exec(normalized);
  if (!match) return defaultMs;

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};
