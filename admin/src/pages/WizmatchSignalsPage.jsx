import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  scored: 'bg-indigo-100 text-indigo-800',
  enriched: 'bg-purple-100 text-purple-800',
  matched: 'bg-green-100 text-green-800',
  drafted: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-orange-100 text-orange-800',
  replied_positive: 'bg-emerald-100 text-emerald-800',
  replied_other: 'bg-gray-100 text-gray-800',
  dead: 'bg-red-100 text-red-800',
  placed: 'bg-teal-100 text-teal-800',
};

export default function WizmatchSignalsPage() {
  const [signals, setSignals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', min_score: '', source: '' });
  const [page, setPage] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSignals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50, offset: page * 50 });
      if (filters.status) params.set('status', filters.status);
      if (filters.min_score) params.set('min_score', filters.min_score);
      if (filters.source) params.set('source', filters.source);
      const data = await apiFetch(`/api/wizmatch/signals?${params}`);
      setSignals(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load signals:', e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { loadSignals(); }, [loadSignals]);

  // Poll for new signals every 30s
  useEffect(() => {
    const interval = setInterval(loadSignals, 30000);
    return () => clearInterval(interval);
  }, [loadSignals]);

  const openDetail = async (signal) => {
    setSelectedSignal(signal);
    setDetailLoading(true);
    try {
      const detail = await apiFetch(`/api/wizmatch/signals/${signal.id}`);
      setSelectedSignal(detail);
    } catch (e) {
      console.error('Failed to load detail:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const scoreColor = (score) => {
    if (score >= 8) return 'bg-emerald-500 text-white';
    if (score >= 7) return 'bg-amber-500 text-white';
    if (score >= 5) return 'bg-blue-500 text-white';
    return 'bg-gray-300 text-gray-700';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Signals</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total signals — auto-refreshes every 30s</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 items-center">
        <select
          value={filters.status}
          onChange={(e) => { setFilters({...filters, status: e.target.value}); setPage(0); }}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="scored">Scored</option>
          <option value="enriched">Enriched</option>
          <option value="matched">Matched</option>
          <option value="drafted">Drafted</option>
          <option value="sent">Sent</option>
          <option value="replied_positive">Positive Reply</option>
          <option value="dead">Dead</option>
        </select>
        <select
          value={filters.min_score}
          onChange={(e) => { setFilters({...filters, min_score: e.target.value}); setPage(0); }}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">Any Score</option>
          <option value="7">7+ (Priority)</option>
          <option value="8">8+ (High)</option>
          <option value="5">5+</option>
        </select>
        <input
          type="text"
          placeholder="Source filter..."
          value={filters.source}
          onChange={(e) => { setFilters({...filters, source: e.target.value}); setPage(0); }}
          className="px-3 py-2 border rounded text-sm w-40"
        />
        <button onClick={loadSignals} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Open</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : signals.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No signals found</td></tr>
            ) : signals.map((s) => (
              <tr key={s.id} onClick={() => openDetail(s)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.job_title}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.company_name || '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={s.days_open >= 30 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                    {s.days_open || 0}d
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${scoreColor(s.score || 0)}`}>
                    {s.score || 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.source}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100'}`}>
                    {s.status?.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="mt-4 flex justify-between items-center">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >Previous</button>
          <span className="text-sm text-gray-500">Page {page + 1} of {Math.ceil(total / 50)}</span>
          <button
            disabled={(page + 1) * 50 >= total}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >Next</button>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedSignal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end" onClick={() => setSelectedSignal(null)}>
          <div className="bg-white w-1/2 h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedSignal.job_title}</h2>
                <p className="text-gray-600">{selectedSignal.company_name || 'Unknown'} · {selectedSignal.location || '—'}</p>
              </div>
              <button onClick={() => setSelectedSignal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {detailLoading ? (
              <p className="text-gray-400">Loading details...</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 uppercase">Score</div>
                    <div className={`text-2xl font-bold ${scoreColor(selectedSignal.score || 0)} w-10 h-10 rounded-full flex items-center justify-center mt-1`}>
                      {selectedSignal.score || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 uppercase">Days Open</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{selectedSignal.days_open || 0}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-500 uppercase">Status</div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${STATUS_COLORS[selectedSignal.status]}`}>
                      {selectedSignal.status?.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                {selectedSignal.score_breakdown && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2">Score Breakdown</h3>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedSignal.score_breakdown, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Decision Maker */}
                {selectedSignal.contact_first_name && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2">Decision Maker</h3>
                    <p className="text-sm">{selectedSignal.contact_first_name} {selectedSignal.contact_last_name || ''}</p>
                  </div>
                )}

                {/* Keywords */}
                {selectedSignal.keywords?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedSignal.keywords.map((k, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{k}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Candidates */}
                {selectedSignal.matched_candidates?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2">Matched Candidates ({selectedSignal.matched_candidates.length})</h3>
                    {selectedSignal.matched_candidates.map((c, i) => (
                      <div key={i} className="border rounded p-3 mb-2">
                        <div className="font-medium text-sm">{c.first_name} {c.last_name}</div>
                        <div className="text-xs text-gray-500">{c.skills?.join(', ')}</div>
                        <div className="text-xs text-gray-500">{c.visa_status} · ${c.rate_hourly}/{c.rate_currency} · {c.availability_status}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drafts */}
                {selectedSignal.drafts?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-2">Email Drafts ({selectedSignal.drafts.length})</h3>
                    {selectedSignal.drafts.map((d, i) => (
                      <div key={i} className="border rounded p-3 mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm">{d.metadata?.subject || '(no subject)'}</span>
                          <span className="text-xs text-gray-400">{d.metadata?.variant}</span>
                        </div>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">{d.content?.slice(0, 200)}...</pre>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await apiFetch(`/api/wizmatch/signals/${selectedSignal.id}/draft`, { method: 'POST' });
                        alert('Drafts generated! Refresh to see them.');
                        openDetail(selectedSignal);
                      } catch (e) { alert('Failed: ' + e.message); }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                  >Generate Drafts</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}