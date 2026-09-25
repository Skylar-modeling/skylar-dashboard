// SMS Inbox — light-themed sub-app inside the dashboard.
// Two-pane layout: conversation list on the left, thread + composer on the right.
// Uses Clerk for auth, hits /api/sms/* for data.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import {
  listConversations,
  loadTemplates,
  loadThread,
  sendMessage,
  updateConversation,
} from '../api/inbox';

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'unread',   label: 'Unread' },
  { key: 'archived', label: 'Archived' },
];

const CLASSIFICATION_LABEL = {
  'yes-en': { text: 'Yes',      tone: 'green' },
  'yes-es': { text: 'Sí',       tone: 'green' },
  'no-en':  { text: 'No',       tone: 'gray' },
  'no-es':  { text: 'No',       tone: 'gray' },
  'question': { text: 'Question', tone: 'amber' },
  'other':  { text: 'Other',    tone: 'gray' },
};

export default function InboxPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [filter, setFilter] = useState('all');
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [thread, setThread] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);

  const refreshList = useCallback(async () => {
    if (!isSignedIn) return;
    setListLoading(true);
    try {
      const { conversations } = await listConversations(getToken, filter);
      setConversations(conversations);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  }, [getToken, filter, isSignedIn]);

  const refreshThread = useCallback(async (phone) => {
    if (!phone || !isSignedIn) return;
    setThreadLoading(true);
    try {
      const data = await loadThread(getToken, phone);
      setThread(data);
    } catch (err) {
      console.error(err);
    } finally {
      setThreadLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => { refreshList(); }, [refreshList]);
  useEffect(() => {
    if (!isSignedIn) return;
    loadTemplates(getToken).then((d) => setTemplates(d.templates || [])).catch(() => {});
  }, [getToken, isSignedIn]);

  // Poll every 30s while the tab is visible.
  useEffect(() => {
    if (!isSignedIn) return;
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') refreshList();
    }, 30000);
    return () => clearInterval(iv);
  }, [refreshList, isSignedIn]);

  useEffect(() => {
    if (selectedPhone) refreshThread(selectedPhone);
  }, [selectedPhone, refreshThread]);

  const handleSelect = (conv) => {
    setSelectedPhone(conv.phone_e164);
    // Optimistically mark as read in the list.
    setConversations((prev) => prev.map((c) =>
      c.id === conv.id ? { ...c, unread: false } : c
    ));
  };

  const handleSend = async () => {
    if (!composeText.trim() || !selectedPhone) return;
    setSending(true);
    try {
      await sendMessage(getToken, { phone: selectedPhone, body: composeText.trim() });
      setComposeText('');
      await refreshThread(selectedPhone);
      await refreshList();
    } catch (err) {
      alert(`Send failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async () => {
    if (!thread?.conversation) return;
    await updateConversation(getToken, thread.conversation.id, { status: 'archived' });
    setSelectedPhone(null);
    setThread(null);
    refreshList();
  };

  if (!isLoaded) {
    return <InboxShell><div className="p-8 text-slate-500">Loading…</div></InboxShell>;
  }
  if (!isSignedIn) {
    return <InboxShell><div className="p-8 text-slate-500">Not signed in.</div></InboxShell>;
  }

  return (
    <InboxShell>
      <div className="flex h-full">
        <ConversationList
          filter={filter} setFilter={setFilter}
          conversations={conversations} loading={listLoading}
          selectedPhone={selectedPhone} onSelect={handleSelect}
        />
        <ThreadPane
          thread={thread} loading={threadLoading}
          templates={templates}
          composeText={composeText} setComposeText={setComposeText}
          onSend={handleSend} sending={sending}
          onArchive={handleArchive}
          hasSelection={!!selectedPhone}
        />
      </div>
    </InboxShell>
  );
}

function InboxShell({ children }) {
  return (
    <div data-theme="inbox" className="inbox-app min-h-screen bg-white text-slate-900">
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-slate-500 hover:text-slate-900 text-sm">← Home</Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-base font-semibold">SMS Inbox</h1>
        </div>
        <div className="text-xs text-slate-400">+1 (917) 779-0946</div>
      </header>
      <div className="h-[calc(100vh-3.5rem)]">{children}</div>
    </div>
  );
}

function ConversationList({ filter, setFilter, conversations, loading, selectedPhone, onSelect }) {
  return (
    <aside className="w-96 border-r border-slate-200 flex flex-col bg-slate-50">
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                filter === f.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 && (
          <div className="p-6 text-sm text-slate-400 text-center">Loading…</div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="p-6 text-sm text-slate-400 text-center">Nothing here.</div>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-white transition-colors cursor-pointer ${
              selectedPhone === c.phone_e164 ? 'bg-white border-l-2 border-l-blue-600' : ''
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {c.unread && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                <span className={`text-sm truncate ${c.unread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                  {c.contact_name || c.contact_email || formatPhone(c.phone_e164)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{formatRelative(c.last_message_at)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {c.classification && CLASSIFICATION_LABEL[c.classification] && (
                <ClassificationChip label={CLASSIFICATION_LABEL[c.classification]} />
              )}
              <div className="text-xs text-slate-500 truncate">{c.last_message_preview || ''}</div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ThreadPane({ thread, loading, templates, composeText, setComposeText, onSend, sending, onArchive, hasSelection }) {
  if (!hasSelection) {
    return (
      <main className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Pick a conversation to view.
      </main>
    );
  }
  if (loading && !thread) {
    return <main className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading thread…</main>;
  }
  if (!thread) return null;

  const { conversation, messages } = thread;
  return (
    <main className="flex-1 flex flex-col bg-white">
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-5 shrink-0">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {conversation.contact_name || formatPhone(conversation.phone_e164)}
          </div>
          <div className="text-xs text-slate-500">
            {conversation.contact_email || formatPhone(conversation.phone_e164)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.classification && CLASSIFICATION_LABEL[conversation.classification] && (
            <ClassificationChip label={CLASSIFICATION_LABEL[conversation.classification]} />
          )}
          <button
            onClick={onArchive}
            className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Archive
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 py-8">No history for this number.</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <div className="border-t border-slate-200 p-3 bg-slate-50 shrink-0">
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setComposeText(t.body)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-700 cursor-pointer"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            placeholder="Type a reply…"
            rows={2}
            className="flex-1 resize-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <button
            onClick={onSend}
            disabled={sending || !composeText.trim()}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <div className="text-[10px] text-slate-400 mt-1">⌘/Ctrl + Enter to send · {composeText.length}/1600</div>
      </div>
    </main>
  );
}

function MessageBubble({ message }) {
  const inbound = message.direction === 'in';
  return (
    <div className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-lg px-3 py-2 rounded-2xl text-sm ${
        inbound
          ? 'bg-slate-100 text-slate-900 rounded-bl-sm'
          : 'bg-blue-600 text-white rounded-br-sm'
      }`}>
        <div className="whitespace-pre-wrap">{message.body}</div>
        <div className={`text-[10px] mt-1 ${inbound ? 'text-slate-400' : 'text-blue-100'}`}>
          {formatShortTime(message.sent_at || message.created_at)}
          {message.status && !inbound && ` · ${message.status}`}
        </div>
      </div>
    </div>
  );
}

function ClassificationChip({ label }) {
  const toneMap = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    gray:  'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${toneMap[label.tone] || toneMap.gray}`}>
      {label.text}
    </span>
  );
}

function formatPhone(e164) {
  if (!e164) return '';
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

function formatRelative(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diffMin = Math.floor((Date.now() - t) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(iso).toLocaleDateString();
}

function formatShortTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
