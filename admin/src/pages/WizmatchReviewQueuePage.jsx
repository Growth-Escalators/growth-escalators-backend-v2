import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

export default function WizmatchReviewQueuePage() {
  const [draftedSignals, setDraftedSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/wizmatch/signals?status=drafted&limit=50');
      setDraftedSignals(data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const i = setInterval(load, 60000); return () => clearInterval(i); }, [load]);

  const sendEmail = async (signalId, messageId) => {
    setSending(signalId);
    try {
      await apiFetch(`/api/wizmatch/signals/${signalId}/send`, {
        method: 'POST',
        body: JSON.stringify({ variant_message_id: messageId }),
      });
      alert('Email sent successfully!');
      load();
    } catch (e) { alert('Send failed: ' + e.message); } finally { setSending(null); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Outreach Review Queue</h1>
      <p className="text-sm text-gray-500 mb-6">{draftedSignals.length} signals awaiting review</p>
      {loading ? <p className="text-gray-400">Loading...</p>
      : draftedSignals.length === 0 ? <p className="text-gray-400">No signals awaiting review</p>
      : (
        <div className="space-y-4">
          {draftedSignals.map(s => (
            <div key={s.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold">{s.job_title}</h3>
              <p className="text-sm text-gray-600">{s.company_name || 'Unknown'} · Score {s.score || 0}</p>
              <ReviewCard signal={s} onSend={(msgId) => sendEmail(s.id, msgId)} sending={sending === s.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ signal, onSend, sending }) {
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const detail = await apiFetch(`/api/wizmatch/signals/${signal.id}`);
      setDrafts(detail.drafts || []);
      if (detail.drafts?.length > 0) setSelected(detail.drafts[0].id);
    } catch (e) { console.error(e); } finally { setLoadingDrafts(false); }
  };

  useEffect(() => { loadDrafts(); }, [signal.id]);

  return (
    <div className="border-t pt-3 mt-2">
      {drafts.length === 0 ? (
        <button onClick={async () => { setLoadingDrafts(true); try { await apiFetch(`/api/wizmatch/signals/${signal.id}/draft`, { method: 'POST' }); await loadDrafts(); } catch(e) { alert(e.message); } finally { setLoadingDrafts(false); } }} disabled={loadingDrafts} className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm">
          {loadingDrafts ? 'Generating...' : 'Generate Drafts'}
        </button>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {drafts.map((d) => (
              <div key={d.id} onClick={() => setSelected(d.id)} className={`border rounded p-2 cursor-pointer ${selected === d.id ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{d.metadata?.subject}</span>
                  <span className="text-gray-400 uppercase">{d.metadata?.variant}</span>
                </div>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">{d.content?.slice(0, 300)}</pre>
              </div>
            ))}
          </div>
          <button onClick={() => selected && onSend(selected)} disabled={!selected || sending} className="px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50">
            {sending ? 'Sending...' : 'Send Selected'}
          </button>
        </>
      )}
    </div>
  );
}