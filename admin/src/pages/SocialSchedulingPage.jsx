import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { apiFetch } from '../lib/api.js';
import {
  Calendar, Plus, RefreshCw, ExternalLink, AlertCircle,
  CheckCircle, Clock, XCircle, Send, ChevronDown, Linkedin,
  Facebook, Instagram, Twitter, Settings
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const POSTIZ_URL = 'https://postiz-frontend-production-2e4c.up.railway.app';

const STATUS_META = {
  published:  { color: 'bg-green-100 text-green-700', label: 'Published', icon: CheckCircle },
  scheduled:  { color: 'bg-sky-100 text-sky-700',     label: 'Scheduled', icon: Clock },
  failed:     { color: 'bg-red-100 text-red-700',     label: 'Failed',    icon: XCircle },
  draft:      { color: 'bg-slate-100 text-slate-500', label: 'Draft',     icon: Clock },
};

const PLATFORM_ICONS = {
  LINKEDIN:  { label: 'LinkedIn',  color: 'text-blue-700',  bg: 'bg-blue-50' },
  FACEBOOK:  { label: 'Facebook',  color: 'text-blue-600',  bg: 'bg-blue-50' },
  INSTAGRAM: { label: 'Instagram', color: 'text-pink-600',  bg: 'bg-pink-50' },
  TWITTER:   { label: 'X / Twitter', color: 'text-slate-800', bg: 'bg-slate-50' },
  TIKTOK:    { label: 'TikTok',    color: 'text-slate-900', bg: 'bg-slate-50' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDatetime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PlatformBadge({ platform }) {
  const p = PLATFORM_ICONS[platform?.toUpperCase()] ?? { label: platform, color: 'text-slate-600', bg: 'bg-slate-50' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${p.bg} ${p.color}`}>
      {p.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Setup banner — shown when POSTIZ_API_KEY is not configured
// ---------------------------------------------------------------------------
function SetupBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-800">Postiz not connected yet</p>
        <p className="text-xs text-amber-700 mt-0.5">
          To enable social scheduling, you need to generate a Postiz API key and add it to Railway.
        </p>
        <ol className="mt-2 space-y-1 text-xs text-amber-700 list-decimal list-inside">
          <li>Open the <a href={POSTIZ_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">Postiz dashboard</a> and create an account</li>
          <li>Go to Settings → API Keys → Generate new key</li>
          <li>Run in terminal: <code className="bg-amber-100 px-1 rounded font-mono">railway variables set POSTIZ_API_KEY=&lt;key&gt; --service web</code></li>
        </ol>
      </div>
      <a href={POSTIZ_URL} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors flex-shrink-0">
        Open Postiz <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick schedule form
// ---------------------------------------------------------------------------
function ScheduleForm({ integrations, onScheduled }) {
  const [integrationId, setIntegrationId] = useState('');
  const [content, setContent] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Default to 24h from now
  useEffect(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    setPublishAt(local.toISOString().slice(0, 16));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!integrationId || !content.trim() || !publishAt) { setError('All fields are required'); return; }
    setSaving(true); setError('');
    try {
      await apiFetch('/api/postiz/schedule', {
        method: 'POST',
        body: JSON.stringify({ integrationId, content: content.trim(), publishAt: new Date(publishAt).toISOString() }),
      });
      setSuccess(true);
      setContent('');
      setTimeout(() => { setSuccess(false); onScheduled(); }, 2000);
    } catch (e) {
      setError(e.message || 'Failed to schedule post');
    } finally {
      setSaving(false);
    }
  }

  const selectedIntegration = integrations.find(i => i.id === integrationId);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Send className="w-4 h-4 text-sky-500" /> Quick Schedule
      </h2>
      {success ? (
        <div className="py-6 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-emerald-700">Post scheduled!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Platform / Account</label>
            {integrations.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                No social accounts connected. <a href={POSTIZ_URL} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline">Connect in Postiz →</a>
              </p>
            ) : (
              <div className="relative">
                <select value={integrationId} onChange={e => setIntegrationId(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                  <option value="">Select account...</option>
                  {integrations.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
              placeholder="Write your post content here..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
            <p className="text-right text-xs text-slate-400 mt-0.5">{content.length} chars</p>
          </div>

          {/* Publish at */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Publish At</label>
            <input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={saving || integrations.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? 'Scheduling...' : 'Schedule Post'}
          </button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scheduled posts list
// ---------------------------------------------------------------------------
function PostsList({ posts, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse"/>)}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
        <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium mb-1">No posts scheduled</p>
        <p className="text-slate-400 text-sm">Use the form on the right to schedule your first post,<br/>or manage posts directly in Postiz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post, i) => (
        <div key={post.id ?? i} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 line-clamp-2">{post.content || post.value || '(no content)'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {post.type && <PlatformBadge platform={post.type} />}
                <StatusBadge status={post.state ?? post.status ?? 'draft'} />
                {(post.publishDate ?? post.scheduledAt) && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {fmtDatetime(post.publishDate ?? post.scheduledAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SocialSchedulingPage() {
  const [posts, setPosts] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [postsRes, intRes] = await Promise.all([
      apiFetch('/api/postiz/scheduled').catch(e => ({ _error: e.message })),
      apiFetch('/api/postiz/integrations').catch(e => ({ _error: e.message })),
    ]);

    if (postsRes?.error === 'POSTIZ_NOT_CONFIGURED' || intRes?.error === 'POSTIZ_NOT_CONFIGURED') {
      setNotConfigured(true);
    } else {
      setNotConfigured(false);
      setPosts(postsRes?.posts ?? []);
      setIntegrations(intRes?.integrations ?? []);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Social Scheduling</h1>
                <p className="text-xs text-slate-500">Schedule posts across LinkedIn, Facebook, Instagram</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Updated {timeAgo(lastUpdated)}
                </span>
              )}
              <button onClick={loadData} disabled={loading}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <a href={POSTIZ_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                <ExternalLink className="w-4 h-4" /> Open Postiz
              </a>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {notConfigured && <SetupBanner />}

          {!notConfigured && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Scheduled posts list — takes 2/3 */}
              <div className="lg:col-span-2">
                <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Scheduled Posts
                  {posts.length > 0 && (
                    <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{posts.length}</span>
                  )}
                </h2>
                <PostsList posts={posts} loading={loading} />
              </div>

              {/* Quick schedule form — 1/3 */}
              <div>
                <ScheduleForm integrations={integrations} onScheduled={loadData} />

                {/* Connected accounts summary */}
                {integrations.length > 0 && (
                  <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" /> Connected Accounts ({integrations.length})
                    </h3>
                    <div className="space-y-2">
                      {integrations.map(i => (
                        <div key={i.id} className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${PLATFORM_ICONS[i.type?.toUpperCase()]?.bg ?? 'bg-slate-50'} flex items-center justify-center`}>
                            <span className="text-[10px] font-bold">{(i.type ?? '?')[0]}</span>
                          </div>
                          <p className="text-xs text-slate-700 truncate flex-1">{i.name}</p>
                          <PlatformBadge platform={i.type} />
                        </div>
                      ))}
                    </div>
                    <a href={`${POSTIZ_URL}/settings`} target="_blank" rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-xs text-sky-600 hover:underline">
                      Manage connections <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
