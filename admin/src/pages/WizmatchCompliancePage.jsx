import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

export default function WizmatchCompliancePage() {
  const [suppressions, setSuppressions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filters.reason) params.set('reason', filters.reason);
      const data = await apiFetch(`/api/wizmatch/suppression?${params}`);
      setSuppressions(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Compliance Log</h1>
      <div className="mb-4 flex gap-3">
        <select value={filters.reason} onChange={e => setFilters({ reason: e.target.value })} className="px-3 py-2 border rounded text-sm">
          <option value="">All Reasons</option>
          <option value="unsubscribe">Unsubscribe</option>
          <option value="hard_bounce">Hard Bounce</option>
          <option value="complaint">Complaint</option>
          <option value="do_not_contact">Do Not Contact</option>
          <option value="manual">Manual</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{total} suppressed emails</span>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            : suppressions.map(s => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-sm font-medium">{s.email}</td>
                <td className="px-4 py-3 text-sm"><span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700">{s.reason}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.source_channel}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.suppressed_at ? new Date(s.suppressed_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}