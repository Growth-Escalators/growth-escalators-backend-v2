import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

const MSA_COLORS = { none: 'bg-gray-100 text-gray-800', in_progress: 'bg-yellow-100 text-yellow-800', signed: 'bg-green-100 text-green-800' };

export default function WizmatchPrimesPage() {
  const [primes, setPrimes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await apiFetch('/api/wizmatch/primes'); setPrimes(data.items || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Primes Management</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MSA Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signed Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Placements</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            : primes.length === 0 ? <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No prime companies yet</td></tr>
            : primes.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{p.domain || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${MSA_COLORS[p.prime_msa_status]}`}>{p.prime_msa_status}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.prime_msa_signed_at ? new Date(p.prime_msa_signed_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3 text-sm">{p.active_placements || 0}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">${((p.monthly_margin || 0)).toLocaleString()}/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}