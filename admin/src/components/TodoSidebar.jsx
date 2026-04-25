import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, ChevronRight, ChevronDown, CheckCircle2, Circle, X, Pencil, ListTodo,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

// ---------------------------------------------------------------------------
// TodoSidebar — Microsoft To-Do-style panel: lists on the left, tasks (with
// checklist subitems) on the right. Tasks share the same /api/tasks store as
// the Kanban — `listId` filters which tasks belong to which list.
// ---------------------------------------------------------------------------
export default function TodoSidebar({
  tasks,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
}) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState(null);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [renaming, setRenaming] = useState(null); // { id, value }
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [checklistByTask, setChecklistByTask] = useState({}); // taskId -> items[]
  const [newItemLabel, setNewItemLabel] = useState({}); // taskId -> string

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/task-lists');
      const next = data.lists ?? [];
      setLists(next);
      setSelectedListId((prev) => prev ?? next[0]?.id ?? null);
    } catch (e) {
      console.error('[TodoSidebar] loadLists failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLists(); }, [loadLists]);

  // --- list CRUD --------------------------------------------------------------
  async function createList() {
    const name = newListName.trim();
    if (!name) return;
    setCreatingList(true);
    try {
      const { list } = await apiFetch('/api/task-lists', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setLists((ls) => [...ls, list]);
      setSelectedListId(list.id);
      setNewListName('');
    } catch (e) {
      alert(`Couldn't create list: ${e.message}`);
    } finally {
      setCreatingList(false);
    }
  }

  async function renameList(id, name) {
    if (!name.trim()) { setRenaming(null); return; }
    try {
      const { list } = await apiFetch(`/api/task-lists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      setLists((ls) => ls.map((l) => l.id === id ? { ...l, ...list } : l));
    } catch (e) {
      alert(`Rename failed: ${e.message}`);
    } finally {
      setRenaming(null);
    }
  }

  async function deleteList(id) {
    if (!confirm('Delete this list? Tasks inside it will stay but lose their list.')) return;
    try {
      await apiFetch(`/api/task-lists/${id}`, { method: 'DELETE' });
      setLists((ls) => ls.filter((l) => l.id !== id));
      if (selectedListId === id) {
        setSelectedListId(lists.find((l) => l.id !== id)?.id ?? null);
      }
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }

  // --- task CRUD (delegates upward) ------------------------------------------
  async function createTask() {
    const title = newTaskTitle.trim();
    if (!title || !selectedListId) return;
    setCreatingTask(true);
    try {
      const { task } = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, listId: selectedListId, status: 'not_started' }),
      });
      onTaskCreated(task);
      setNewTaskTitle('');
    } catch (e) {
      alert(`Couldn't add task: ${e.message}`);
    } finally {
      setCreatingTask(false);
    }
  }

  async function toggleTaskDone(task) {
    const newStatus = task.status === 'done' ? 'not_started' : 'done';
    try {
      const { task: updated } = await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      onTaskUpdated(updated);
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  }

  async function deleteTask(task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      onTaskDeleted(task.id);
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }

  // --- checklist CRUD ---------------------------------------------------------
  async function loadChecklist(taskId) {
    try {
      const data = await apiFetch(`/api/tasks/${taskId}/checklist-items`);
      setChecklistByTask((m) => ({ ...m, [taskId]: data.items ?? [] }));
    } catch (e) {
      console.error('[TodoSidebar] loadChecklist failed:', e);
    }
  }

  function toggleExpanded(task) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(task.id);
    if (!checklistByTask[task.id]) loadChecklist(task.id);
  }

  async function addChecklistItem(taskId) {
    const label = (newItemLabel[taskId] || '').trim();
    if (!label) return;
    try {
      const { item } = await apiFetch(`/api/tasks/${taskId}/checklist-items`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      setChecklistByTask((m) => ({ ...m, [taskId]: [...(m[taskId] ?? []), item] }));
      setNewItemLabel((m) => ({ ...m, [taskId]: '' }));
    } catch (e) {
      alert(`Couldn't add subitem: ${e.message}`);
    }
  }

  async function toggleItem(taskId, item) {
    const next = !item.isDone;
    setChecklistByTask((m) => ({
      ...m,
      [taskId]: (m[taskId] ?? []).map((it) => it.id === item.id ? { ...it, isDone: next } : it),
    }));
    try {
      await apiFetch(`/api/tasks/${taskId}/checklist-items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDone: next }),
      });
    } catch (e) {
      // revert
      setChecklistByTask((m) => ({
        ...m,
        [taskId]: (m[taskId] ?? []).map((it) => it.id === item.id ? { ...it, isDone: item.isDone } : it),
      }));
      alert(`Toggle failed: ${e.message}`);
    }
  }

  async function deleteItem(taskId, item) {
    setChecklistByTask((m) => ({
      ...m,
      [taskId]: (m[taskId] ?? []).filter((it) => it.id !== item.id),
    }));
    try {
      await apiFetch(`/api/tasks/${taskId}/checklist-items/${item.id}`, { method: 'DELETE' });
    } catch (e) {
      // refetch on failure to resync
      loadChecklist(taskId);
      alert(`Delete failed: ${e.message}`);
    }
  }

  // --- derived ----------------------------------------------------------------
  const tasksInList = useMemo(() => {
    if (!selectedListId) return [];
    return tasks
      .filter((t) => t.listId === selectedListId)
      .sort((a, b) => {
        // open first, then by dueAt asc, then by updatedAt desc
        if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
        if (a.dueAt && b.dueAt) return new Date(a.dueAt) - new Date(b.dueAt);
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      });
  }, [tasks, selectedListId]);

  const counts = useMemo(() => {
    const map = {};
    for (const l of lists) map[l.id] = { total: 0, open: 0 };
    for (const t of tasks) {
      if (!t.listId || !map[t.listId]) continue;
      map[t.listId].total += 1;
      if (t.status !== 'done') map[t.listId].open += 1;
    }
    return map;
  }, [tasks, lists]);

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null;

  // ---------------------------------------------------------------------------
  return (
    <aside className="w-[540px] shrink-0 border-l border-slate-200 bg-white flex min-h-0">
      {/* Inner left: lists */}
      <div className="w-[200px] shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="px-3 py-3 border-b border-slate-200 flex items-center gap-1.5 text-slate-700">
          <ListTodo className="w-4 h-4" />
          <h2 className="text-sm font-semibold">My Lists</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading && lists.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6">Loading…</p>
          ) : lists.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-400">
              No lists yet. Create one below to start grouping tasks.
            </p>
          ) : (
            <ul>
              {lists.map((l) => {
                const isActive = l.id === selectedListId;
                const c = counts[l.id] ?? { total: 0, open: 0 };
                const isRenaming = renaming?.id === l.id;
                return (
                  <li
                    key={l.id}
                    className={`group flex items-center gap-1 px-2 mx-1.5 my-0.5 rounded-md text-sm cursor-pointer ${
                      isActive ? 'bg-sky-100 text-sky-800' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => !isRenaming && setSelectedListId(l.id)}
                  >
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renaming.value}
                        onChange={(e) => setRenaming({ id: l.id, value: e.target.value })}
                        onBlur={() => renameList(l.id, renaming.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameList(l.id, renaming.value);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="flex-1 min-w-0 bg-white border border-slate-200 rounded px-1.5 py-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span className="flex-1 min-w-0 truncate py-1.5">{l.name}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-sky-200 text-sky-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {c.open}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRenaming({ id: l.id, value: l.name }); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700"
                          aria-label="Rename list"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteList(l.id); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"
                          aria-label="Delete list"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-slate-200 p-2">
          <div className="flex items-center gap-1">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createList(); }}
              placeholder="+ New list"
              className="flex-1 min-w-0 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-300 bg-white"
            />
            <button
              onClick={createList}
              disabled={creatingList || !newListName.trim()}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-medium rounded px-2 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Inner right: tasks in selected list */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 truncate">
              {selectedList?.name ?? 'Pick a list'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {tasksInList.filter((t) => t.status !== 'done').length} open · {tasksInList.length} total
            </p>
          </div>
        </div>

        {selectedList ? (
          <>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {tasksInList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">
                  No tasks in this list yet. Add one below.
                </p>
              ) : (
                <ul className="space-y-1">
                  {tasksInList.map((t) => {
                    const expanded = expandedTaskId === t.id;
                    const items = checklistByTask[t.id] ?? [];
                    return (
                      <li key={t.id} className="group rounded-lg hover:bg-slate-50">
                        <div className="flex items-start gap-2 px-2 py-2">
                          <button
                            onClick={() => toggleTaskDone(t)}
                            className="shrink-0 mt-0.5"
                            aria-label={t.status === 'done' ? 'Mark not done' : 'Mark done'}
                          >
                            {t.status === 'done' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 hover:text-sky-500 transition-colors" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleExpanded(t)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className={`text-sm leading-tight ${
                              t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}>
                              {t.title}
                            </p>
                          </button>
                          <button
                            onClick={() => toggleExpanded(t)}
                            className="text-slate-400 hover:text-slate-700 shrink-0"
                            aria-label={expanded ? 'Collapse' : 'Expand'}
                          >
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteTask(t)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 shrink-0"
                            aria-label="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {expanded && (
                          <div className="pl-9 pr-2 pb-2">
                            {items.length > 0 && (
                              <ul className="space-y-0.5 mb-1">
                                {items.map((it) => (
                                  <li key={it.id} className="group/item flex items-center gap-2">
                                    <button
                                      onClick={() => toggleItem(t.id, it)}
                                      className="shrink-0"
                                      aria-label={it.isDone ? 'Mark not done' : 'Mark done'}
                                    >
                                      {it.isDone ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-slate-300 hover:text-sky-500" />
                                      )}
                                    </button>
                                    <span className={`flex-1 text-xs ${it.isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                      {it.label}
                                    </span>
                                    <button
                                      onClick={() => deleteItem(t.id, it)}
                                      className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-600"
                                      aria-label="Delete subitem"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="flex items-center gap-1">
                              <input
                                value={newItemLabel[t.id] ?? ''}
                                onChange={(e) => setNewItemLabel((m) => ({ ...m, [t.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') addChecklistItem(t.id); }}
                                placeholder="+ Add subitem"
                                className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-300"
                              />
                              <button
                                onClick={() => addChecklistItem(t.id)}
                                disabled={!(newItemLabel[t.id] ?? '').trim()}
                                className="text-xs text-sky-600 hover:text-sky-800 disabled:opacity-40 px-1"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-200 p-2">
              <div className="flex items-center gap-1">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createTask(); }}
                  placeholder="+ Add a task"
                  className="flex-1 text-sm border border-slate-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-sky-300"
                />
                <button
                  onClick={createTask}
                  disabled={creatingTask || !newTaskTitle.trim()}
                  className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-medium rounded px-3 py-2"
                >
                  Add
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <p className="text-xs text-slate-400">
              Create a list on the left to start adding tasks.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
