// BulkToolbar — pinned bottom-centre bar shown when >=1 task is selected.
// Extracted verbatim from legacy admin/src/pages/TasksBoardPage.jsx (lines 1481–1585)
// so the legacy file can be deleted once Tasks v2 is wired.
//
// Props:
//   selectedIds : string[]                  — ids of tasks currently selected
//   team        : Array<{id, name}>         — assignable members
//   onClear()                               — clear selection
//   onApplied(tasks, patch)                 — fired after PATCH so parent can refetch
//   onDeleted(ids)                          — fired after bulk delete

import { useEffect, useRef, useState } from 'react';
import { User, ChevronDown, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { COLUMNS } from './lib/tokens.js';

export default function BulkToolbar({ selectedIds, team, onClear, onApplied, onDeleted }) {
  const [showAssignee, setShowAssignee] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!showAssignee) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowAssignee(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showAssignee]);

  async function applyPatch(patch) {
    try {
      const data = await apiFetch('/api/tasks/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, patch }),
      });
      onApplied(data.tasks || [], patch);
    } catch (e) {
      alert(`Bulk update failed: ${e.message}`);
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} task${selectedIds.length === 1 ? '' : 's'}?`)) return;
    try {
      await apiFetch('/api/tasks/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds }),
      });
      onDeleted(selectedIds);
    } catch (e) {
      alert(`Bulk delete failed: ${e.message}`);
    }
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-2.5 flex items-center gap-3 z-40 border border-slate-700">
      <span className="text-xs font-medium">
        {selectedIds.length} selected
      </span>
      <span className="w-px h-5 bg-slate-700" />

      <select
        defaultValue=""
        onChange={(e) => { if (e.target.value) { applyPatch({ status: e.target.value }); e.target.value = ''; } }}
        className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400"
      >
        <option value="" disabled>Set status…</option>
        {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>

      <select
        defaultValue=""
        onChange={(e) => { if (e.target.value) { applyPatch({ priority: e.target.value }); e.target.value = ''; } }}
        className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400"
      >
        <option value="" disabled>Set priority…</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <div ref={ref} className="relative">
        <button
          onClick={() => setShowAssignee((v) => !v)}
          className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 hover:bg-slate-700 inline-flex items-center gap-1"
        >
          <User className="w-3 h-3" /> Assign…
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        {showAssignee && (
          <div className="absolute bottom-full mb-1 right-0 w-48 bg-white text-slate-800 border border-slate-200 rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto">
            <button
              onClick={() => { setShowAssignee(false); applyPatch({ assignedTo: null }); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50"
            >
              Unassigned
            </button>
            <div className="border-t border-slate-100 my-0.5" />
            {team.map((m) => (
              <button
                key={m.id}
                onClick={() => { setShowAssignee(false); applyPatch({ assignedTo: m.id }); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-sky-50"
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={bulkDelete}
        className="text-xs bg-red-600 hover:bg-red-700 rounded px-2 py-1 inline-flex items-center gap-1"
      >
        <Trash2 className="w-3 h-3" /> Delete
      </button>

      <span className="w-px h-5 bg-slate-700" />
      <button onClick={onClear} className="text-xs text-slate-300 hover:text-white">Clear selection</button>
    </div>
  );
}
