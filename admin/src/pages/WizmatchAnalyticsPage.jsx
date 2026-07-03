import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

export default function WizmatchAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([
        apiFetch('/api/wizmatch/analytics'),
        apiFetch('/api/wizmatch/digest'),
      ]);
      setAnalytics(a);
      setDigest(d);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-6"><p className="text-gray-400">Loading...</p></div>;

  const s = digest?.stats || {};

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Signals Today" value={s.signals_captured || 0} sub={`${s.signals_priority || 0} priority`} />
        <KpiCard label="Sends Today" value={s.sends || 0} />
        <KpiCard label="Positive Replies" value={s.positive_replies || 0} />
        <KpiCard label="Candidates" value={s.candidates_sourced || 0} />
      </div>

      {/* Domain Health */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Domain Performance</h2>
        <div className="bg-white rounded-lg shadow p-4">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs text-gray-500 uppercase pb-2">Domain</th>
                <th className="text-right text-xs text-gray-500 uppercase pb-2">Sends 7d</th>
                <th className="text-right text-xs text-gray-500 uppercase pb-2">Reply Rate</th>
                <th className="text-right text-xs text-gray-500 uppercase pb-2">Bounce Rate</th>
                <th className="text-center text-xs text-gray-500 uppercase pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.domains || []).map(d => (
                <tr key={d.domain} className="border-b last:border-0">
                  <td className="py-2 text-sm font-medium">{d.domain}</td>
                  <td className="py-2 text-sm text-right">{d.sends_7d}</td>
                  <td className="py-2 text-sm text-right">{(d.reply_rate_7d * 100).toFixed(1)}%</td>
                  <td className="py-2 text-sm text-right">{(d.bounce_rate_7d * 100).toFixed(1)}%</td>
                  <td className="py-2 text-center"><span className={`px-2 py-0.5 rounded text-xs ${d.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline Value */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Pipeline Value by Stage</h2>
        <div className="bg-white rounded-lg shadow p-4">
          {(analytics?.pipeline || []).map(p => (
            <div key={p.status} className="flex items-center gap-3 mb-2">
              <span className="text-sm w-32 capitalize">{p.status}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                <div className="bg-indigo-500 h-6 rounded-full flex items-center justify-end px-2" style={{ width: `${Math.min(100, (p.count / Math.max(...(analytics?.pipeline?.map(x => x.count) || [1]))) * 100)}%` }}>
                  <span className="text-xs text-white font-medium">{p.count}</span>
                </div>
              </div>
              <span className="text-sm text-green-600 w-24 text-right">${((p.monthly_value || 0)).toLocaleString()}</span>
            </div>
          ))}
          {(analytics?.pipeline || []).length === 0 && <p className="text-gray-400 text-sm">No placements yet</p>}
        </div>
      </div>

      {/* Source Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Signals by Source</h2>
        <div className="bg-white rounded-lg shadow p-4">
          {(analytics?.sources || []).map(src => (
            <div key={src.source} className="flex justify-between items-center py-2 border-b last:border-0">
              <span className="text-sm font-medium capitalize">{src.source}</span>
              <div className="flex gap-4">
                <span className="text-sm">{src.count} signals</span>
                <span className="text-sm text-gray-500">avg score {Number(src.avg_score).toFixed(1)}</span>
              </div>
            </div>
          ))}
          {(analytics?.sources || []).length === 0 && <p className="text-gray-400 text-sm">No signals yet</p>}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-3xl font-bold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}