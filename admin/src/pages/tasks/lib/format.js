// Format + display helpers for the Tasks redesign.
// Ported from prototype tasks/data.jsx and adapted for real API field names
// (assignedTo instead of mock 'assignee', commentCount/attachmentCount, etc.).

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return (parts.length === 1
    ? parts[0].slice(0, 2)
    : parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
}

// Resolve a task.assignedTo value (uuid or legacy email) → human name string,
// falling back to the raw value if no team match.
export function displayAssignee(value, team) {
  if (!value) return null;
  if (!Array.isArray(team)) return value;
  const m = team.find((t) => t.id === value || t.email === value);
  return m?.name || m?.email || value;
}

// Day-difference computed in Asia/Kolkata regardless of the browser's local
// timezone. Returns due_date - now_date in whole days. The team works in IST
// and tasks/dueAt are stored as UTC instants; doing the math in the local
// browser timezone would shift "today" boundaries if anyone's machine clock
// is set to UTC (e.g. in a Docker container) or another zone.
function daysBetweenInIST(nowIso, dueIso) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const nowStr = fmt.format(new Date(nowIso));  // "YYYY-MM-DD"
  const dueStr = fmt.format(new Date(dueIso));
  // Parse the YYYY-MM-DD strings as UTC dates and diff — independent of
  // either system timezone since both sides use the same anchor.
  const nowUtc = Date.UTC(+nowStr.slice(0, 4), +nowStr.slice(5, 7) - 1, +nowStr.slice(8, 10));
  const dueUtc = Date.UTC(+dueStr.slice(0, 4), +dueStr.slice(5, 7) - 1, +dueStr.slice(8, 10));
  return Math.round((dueUtc - nowUtc) / 86400000);
}

// Relative-distance formatter — "Today", "Tomorrow", "Yesterday",
// weekday short for in-week, "Nd overdue" for past, day+month for far future.
export function fmtDue(iso, now = new Date()) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = daysBetweenInIST(now, d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(d);
  }
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(d);
}

// Ageing tone for a task — used to colour the DueChip.
export function dueTone(task, now = new Date()) {
  if (!task?.dueAt || task.status === 'done') return 'neutral';
  const d = new Date(task.dueAt);
  if (isNaN(d.getTime())) return 'neutral';
  const diff = daysBetweenInIST(now, d);
  if (diff < 0) return 'overdue';
  if (diff <= 1) return 'soon';
  if (diff <= 7) return 'week';
  return 'later';
}
