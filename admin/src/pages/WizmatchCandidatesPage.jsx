import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

const VISA_COLORS = { H1B: 'bg-blue-100 text-blue-800', GC: 'bg-green-100 text-green-800', USC: 'bg-purple-100 text-purple-800', OPT: 'bg-yellow-100 text-yellow-800' };
const AVAIL_COLORS = { available: 'bg-green-100 text-green-800', submitted: 'bg-blue-100 text-blue-800', interviewing: 'bg-yellow-100 text-yellow-800', placed: 'bg-emerald-100 text-emerald-800', benched: 'bg-gray-100 text-gray-800' };

export default function WizmatchCandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ skill: '', visa_status: '', availability_status: '', source: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
      const data = await apiFetch(`/api/wizmatch/candidates?${params}`);
      setCandidates(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Candidate Pool</h1>
          <p className="text-sm text-gray-500 mt-1">{total} candidates</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Add Candidate</button>
      </div>

      {showAddForm && (
        <AddCandidateForm onDone={() => { setShowAddForm(false); load(); }} />
      )}

      <div className="mb-4 flex gap-3">
        <input placeholder="Skill..." value={filters.skill} onChange={e => setFilters({...filters, skill: e.target.value})} className="px-3 py-2 border rounded text-sm w-32" />
        <select value={filters.visa_status} onChange={e => setFilters({...filters, visa_status: e.target.value})} className="px-3 py-2 border rounded text-sm">
          <option value="">Any Visa</option>
          <option>H1B</option><option>GC</option><option>USC</option><option>OPT</option><option>unknown</option>
        </select>
        <select value={filters.availability_status} onChange={e => setFilters({...filters, availability_status: e.target.value})} className="px-3 py-2 border rounded text-sm">
          <option value="">Any Availability</option>
          <option>available</option><option>submitted</option><option>placed</option><option>benched</option>
        </select>
        <select value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})} className="px-3 py-2 border rounded text-sm">
          <option value="">Any Source</option>
          <option>xray</option><option>github</option><option>naukri</option><option>manual</option><option>referral</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avail.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            : candidates.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1">{c.skills?.slice(0, 4).map((s, i) => <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{s}</span>)}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.location || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${VISA_COLORS[c.visa_status] || 'bg-gray-100'}`}>{c.visa_status || '—'}</span></td>
                <td className="px-4 py-3 text-sm">{c.rate_hourly ? `$${c.rate_hourly}/${c.rate_currency}` : '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${AVAIL_COLORS[c.availability_status] || 'bg-gray-100'}`}>{c.availability_status}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddCandidateForm({ onDone }) {
  const [form, setForm] = useState({ name: '', email: '', skills: '', location: '', visa_status: 'unknown', rate_hourly: '', source: 'manual' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/wizmatch/candidates', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
          rate_hourly: form.rate_hourly ? Number(form.rate_hourly) : undefined,
        }),
      });
      onDone();
    } catch (e) { alert('Failed: ' + e.message); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="mb-4 bg-white p-4 rounded-lg shadow grid grid-cols-3 gap-3">
      <input required placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="px-3 py-2 border rounded text-sm" />
      <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="px-3 py-2 border rounded text-sm" />
      <input required placeholder="Skills (comma-sep)" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} className="px-3 py-2 border rounded text-sm" />
      <input placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="px-3 py-2 border rounded text-sm" />
      <select value={form.visa_status} onChange={e => setForm({...form, visa_status: e.target.value})} className="px-3 py-2 border rounded text-sm">
        <option>unknown</option><option>H1B</option><option>GC</option><option>USC</option><option>OPT</option>
      </select>
      <input type="number" placeholder="Rate/hr" value={form.rate_hourly} onChange={e => setForm({...form, rate_hourly: e.target.value})} className="px-3 py-2 border rounded text-sm" />
      <button disabled={saving} className="col-span-3 px-4 py-2 bg-indigo-600 text-white rounded text-sm">{saving ? 'Saving...' : 'Add Candidate'}</button>
    </form>
  );
}