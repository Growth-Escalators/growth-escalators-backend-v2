import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { apiFetch } from '../lib/api.js';
import { Share2, Globe, Camera, Plus, Trash2, AlertCircle } from 'lucide-react';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function PlatformIcon({ platform, size = 'w-4 h-4' }) {
  if (platform === 'facebook') return <Globe className={`${size} text-blue-600`} />;
  if (platform === 'instagram') return <Camera className={`${size} text-pink-500`} />;
  return <Share2 className={`${size} text-slate-400`} />;
}

function StatusBadge({ status }) {
  const map = {
    published: { color: 'bg-green-100 text-green-700', label: 'Published' },
    scheduled: { color: 'bg-sky-100 text-sky-700', label: 'Scheduled' },
    failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
    draft: { color: 'bg-slate-100 text-slate-500', label: 'Draft' },
  };
  const s = map[status] || map.draft;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
}

function ConnectModal({ onClose, onSave }) {
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!pageId || !pageName || !accessToken) { setError('All fields required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ pageId, pageName, accessToken });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Connect Facebook Page</h2>
        <p className="text-sm text-slate-500 mb-5">Enter your Facebook Page details. Instagram will be auto-linked if connected.</p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-xs text-amber-800">
          <strong>How to get Page Access Token:</strong><br />
          Go to <em>graph.facebook.com/explorer</em> → select your page → copy the Page Access Token with <em>pages_manage_posts</em> permission.
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Page ID</label>
            <input value={pageId} onChange={e => setPageId(e.target.value)} placeholder="e.g. 123456789"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Page Name</label>
            <input value={pageName} onChange={e => setPageName(e.target.value)} placeholder="e.g. Growth Escalators"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Page Access Token</label>
            <textarea value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder="EAA..."
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-xs" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50">
            {saving ? 'Connecting…' : 'Connect Page'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Compose tab
function ComposeTab({ accounts, onPost }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [content, setContent] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [posting, setPosting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const activeAccounts = accounts.filter(a => a.isActive);
  const MAX_FB = 63206;
  const MAX_IG = 2200;
  const hasIG = selectedIds.some(id => accounts.find(a => a.id === id)?.platform === 'instagram');
  const charLimit = hasIG ? MAX_IG : MAX_FB;

  function toggleAccount(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handlePost() {
    if (!selectedIds.length) { setError('Select at least one account'); return; }
    if (!content.trim()) { setError('Add some content'); return; }
    setPosting(true);
    setError('');
    try {
      await apiFetch('/api/social/posts', {
        method: 'POST',
        body: JSON.stringify({
          socialAccountIds: selectedIds,
          content,
          scheduledAt: schedule && scheduledAt ? scheduledAt : null,
        }),
      });
      setDone(true);
      setContent('');
      setSelectedIds([]);
      setSchedule(false);
      setScheduledAt('');
      onPost();
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="flex gap-6">
      {/* Left: composer */}
      <div className="flex-1 space-y-4">
        {/* Account chips */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Post To</p>
          {activeAccounts.length === 0 && (
            <p className="text-sm text-slate-400">No connected accounts. Add one in the Accounts tab.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {activeAccounts.map(acct => (
              <button
                key={acct.id}
                onClick={() => toggleAccount(acct.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  selectedIds.includes(acct.id)
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-sky-300'
                }`}
              >
                <PlatformIcon platform={acct.platform} size="w-3.5 h-3.5" />
                {acct.accountName}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caption</p>
            <span className={`text-xs ${content.length > charLimit ? 'text-red-500' : 'text-slate-400'}`}>
              {content.length}/{charLimit}
            </span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What would you like to share?"
            rows={6}
            className="w-full border-0 resize-none focus:outline-none text-sm text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={schedule} onChange={e => setSchedule(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-700 font-medium">Schedule for later</span>
            </label>
            {schedule && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {done && <p className="text-sm text-green-600">Post submitted!</p>}

        <button
          onClick={handlePost}
          disabled={posting}
          className="w-full py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold hover:bg-sky-700 disabled:opacity-50"
        >
          {posting ? 'Posting…' : schedule ? 'Schedule Post' : 'Post Now'}
        </button>
      </div>

      {/* Right: preview */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</p>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold">GE</div>
              <div>
                <p className="text-sm font-medium text-slate-800">Growth Escalators</p>
                <p className="text-xs text-slate-400">Just now</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words min-h-12">
              {content || <span className="text-slate-300">Your post content will appear here…</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calendar tab
function CalendarTab() {
  const [month, setMonth] = useState(() => new Date());
  const [posts, setPosts] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2,'0')}`;

  useEffect(() => {
    apiFetch(`/api/social/calendar?month=${monthStr}`)
      .then(d => setPosts(d?.posts || []))
      .catch(() => {});
  }, [monthStr]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startPad = firstDay.getDay();

  function postsByDay(day) {
    return posts.filter(p => {
      const d = new Date(p.createdAt);
      return d.getDate() === day && d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Month nav */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
        <button onClick={() => { const d = new Date(month); d.setMonth(d.getMonth()-1); setMonth(d); }}
          className="p-1 hover:bg-slate-100 rounded text-slate-600">&lt;</button>
        <p className="font-semibold text-slate-800">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => { const d = new Date(month); d.setMonth(d.getMonth()+1); setMonth(d); }}
          className="p-1 hover:bg-slate-100 rounded text-slate-600">&gt;</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} className="h-24 border-r border-b border-slate-50" />)}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const day = i + 1;
          const dayPosts = postsByDay(day);
          const isSelected = selectedDay === day;
          return (
            <div
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`h-24 border-r border-b border-slate-50 p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
            >
              <p className={`text-xs font-medium mb-1 ${isSelected ? 'text-sky-600' : 'text-slate-600'}`}>{day}</p>
              <div className="space-y-0.5 overflow-hidden">
                {dayPosts.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <PlatformIcon platform={p.platform} size="w-3 h-3" />
                    <span className="text-xs text-slate-500 truncate">{(p.content || '').slice(0, 20)}</span>
                  </div>
                ))}
                {dayPosts.length > 3 && <p className="text-xs text-slate-400">+{dayPosts.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day detail */}
      {selectedDay && postsByDay(selectedDay).length > 0 && (
        <div className="border-t border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">{selectedDay} {month.toLocaleDateString('en-IN', { month: 'long' })}</p>
          <div className="space-y-2">
            {postsByDay(selectedDay).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <PlatformIcon platform={p.platform} size="w-4 h-4" />
                <p className="text-sm text-slate-700 flex-1 truncate">{p.content}</p>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Accounts tab
function AccountsTab({ accounts, onDelete, onAdd }) {
  const [showModal, setShowModal] = useState(false);

  async function connectPage(data) {
    await apiFetch('/api/social/accounts/connect-facebook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    onAdd();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700"
        >
          <Plus className="w-4 h-4" />
          Connect Facebook Page
        </button>
      </div>

      {accounts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No social accounts connected yet.</p>
          <p className="text-slate-400 text-xs mt-1">Click "Connect Facebook Page" to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {accounts.map(acct => (
          <div key={acct.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <PlatformIcon platform={acct.platform} size="w-8 h-8" />
            <div className="flex-1">
              <p className="font-medium text-slate-800">{acct.accountName}</p>
              <p className="text-xs text-slate-400 capitalize">{acct.platform} · Connected {new Date(acct.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${acct.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {acct.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => onDelete(acct.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <ConnectModal
          onClose={() => setShowModal(false)}
          onSave={connectPage}
        />
      )}
    </div>
  );
}

export default function SocialPage() {
  const [tab, setTab] = useState('compose');
  const [accounts, setAccounts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    apiFetch('/api/social/accounts')
      .then(d => setAccounts(d?.accounts || []))
      .catch(() => {});
  }, [refreshKey]);

  async function deleteAccount(id) {
    try {
      await apiFetch(`/api/social/accounts/${id}`, { method: 'DELETE' });
      setRefreshKey(k => k + 1);
    } catch {}
  }

  const TABS = [
    { id: 'compose', label: 'Compose' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'accounts', label: 'Accounts' },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <Share2 className="w-5 h-5 text-sky-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Social Media</h1>
            <p className="text-xs text-slate-500">Post to Facebook & Instagram</p>
          </div>
          {/* Tabs */}
          <div className="ml-auto flex bg-slate-100 rounded-lg p-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {tab === 'compose' && <ComposeTab accounts={accounts} onPost={() => setRefreshKey(k => k+1)} />}
          {tab === 'calendar' && <CalendarTab />}
          {tab === 'accounts' && <AccountsTab accounts={accounts} onDelete={deleteAccount} onAdd={() => setRefreshKey(k => k+1)} />}
        </div>
      </main>
    </div>
  );
}
