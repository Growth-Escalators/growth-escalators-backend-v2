export function safeText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

export function safeLower(value) {
  return safeText(value).toLowerCase();
}

export function safeInitial(value, fallback = '?') {
  return safeText(value).trim().charAt(0) || fallback;
}
