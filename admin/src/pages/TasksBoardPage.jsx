// Legacy /tasks entry point — kept as a thin re-export after the Tasks v2
// cutover so the existing `/tasks` route resolves to the new shell.
// The 3000-line implementation that lived here has been decomposed into
// admin/src/pages/tasks/* (TasksPage, Board, Column, TaskCard, DetailPanel,
// FocusView, ListView, CalendarView, BulkToolbar, TeamPerformanceTab + atoms
// and lib helpers).
export { default } from './tasks/TasksPage.jsx';
