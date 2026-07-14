const PREVIEW_LINKS = [
  ['/wizmatch/review-workbench-demo', 'Workbench'],
  ['/wizmatch/requirement-priority-new-demo', 'Requirements'],
  ['/wizmatch/client-discovery-new-demo', 'Clients'],
  ['/wizmatch/contact-intelligence-new-demo', 'Contacts'],
  ['/wizmatch/candidate-intelligence-new-demo', 'Candidates'],
  ['/wizmatch/readiness-demo', 'Readiness'],
  ['/wizmatch/analytics-new-demo', 'Analytics'],
];

/**
 * Demo routes are development-only. Keeping the same rule for links prevents
 * authenticated production users from being sent to routes that do not exist.
 */
export function getWizmatchPreviewLinks(isDevelopment = import.meta.env.DEV) {
  return isDevelopment ? PREVIEW_LINKS : [];
}
