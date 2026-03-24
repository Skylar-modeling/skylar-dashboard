import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Layout from '../components/Layout';
import { ROLES, ROLE_LABELS } from '../config/constants';

const ALL_ROLES = Object.values(ROLES);

export default function AdminPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);

  // Add user form
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formFirst, setFormFirst] = useState('');
  const [formLast, setFormLast] = useState('');
  const [formRoles, setFormRoles] = useState([]);
  const [formError, setFormError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateRole = async (userId, newRoles) => {
    setSaving(userId);
    try {
      const token = await getToken();
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRoles }),
      });
      await fetchUsers();
    } catch {
      setError('Failed to update role');
    } finally {
      setSaving(null);
    }
  };

  const deactivateUser = async (userId) => {
    if (!confirm('Deactivate this user? They will no longer be able to sign in.')) return;
    setSaving(userId);
    try {
      const token = await getToken();
      await fetch('/api/users', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      await fetchUsers();
    } catch {
      setError('Failed to deactivate user');
    } finally {
      setSaving(null);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!formEmail) { setFormError('Email is required'); return; }
    setFormError(null);
    setSaving('new');
    try {
      const token = await getToken();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail,
          firstName: formFirst,
          lastName: formLast,
          role: formRoles,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.errors?.[0]?.message || data.error || 'Failed to create user');
        return;
      }
      setFormEmail(''); setFormFirst(''); setFormLast(''); setFormRoles([]);
      setShowForm(false);
      await fetchUsers();
    } catch {
      setFormError('Failed to create user');
    } finally {
      setSaving(null);
    }
  };

  const toggleFormRole = (role) => {
    setFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Layout title="User Management">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm bg-[var(--color-accent-blue)] text-white rounded-lg hover:bg-[var(--color-accent-blue)]/80 transition-colors cursor-pointer"
        >
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Add User Form */}
      {showForm && (
        <form onSubmit={addUser} className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Add New User</h3>
          {formError && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <input
              type="email"
              placeholder="Email *"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
            />
            <input
              type="text"
              placeholder="First Name"
              value={formFirst}
              onChange={(e) => setFormFirst(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={formLast}
              onChange={(e) => setFormLast(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
            />
          </div>
          <div className="mb-4">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">Assign roles (select multiple):</p>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleFormRole(role)}
                  className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${
                    formRoles.includes(role)
                      ? 'bg-[var(--color-accent-blue)] border-[var(--color-accent-blue)] text-white'
                      : 'bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-blue)]'
                  }`}
                >
                  {ROLE_LABELS[role] || role}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving === 'new'}
            className="px-4 py-2 text-sm bg-[var(--color-accent-green)] text-white rounded-lg hover:bg-[var(--color-accent-green)]/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving === 'new' ? 'Creating...' : 'Create User'}
          </button>
        </form>
      )}

      {/* User Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Roles</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  saving={saving === u.id}
                  onUpdateRole={(roles) => updateRole(u.id, roles)}
                  onDeactivate={() => deactivateUser(u.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

function UserRow({ user, saving, onUpdateRole, onDeactivate }) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
  const email = user.email_addresses?.[0]?.email_address || '—';
  const currentRoles = user.public_metadata?.role || [];
  const roleList = Array.isArray(currentRoles) ? currentRoles : [currentRoles].filter(Boolean);
  const isBanned = user.banned;

  const toggleRole = (role) => {
    const newRoles = roleList.includes(role)
      ? roleList.filter((r) => r !== role)
      : [...roleList, role];
    onUpdateRole(newRoles);
  };

  return (
    <tr className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-primary)]/50">
      <td className="py-3 px-4 text-[var(--color-text-primary)]">{name}</td>
      <td className="py-3 px-4 text-[var(--color-text-secondary)]">{email}</td>
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {ALL_ROLES.map((role) => (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              disabled={saving}
              className={`px-2 py-0.5 text-xs rounded cursor-pointer transition-colors ${
                roleList.includes(role)
                  ? 'bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue)] border border-[var(--color-accent-blue)]/30'
                  : 'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-accent-blue)]/50'
              } ${saving ? 'opacity-50' : ''}`}
            >
              {ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-1 rounded ${isBanned ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
          {isBanned ? 'Banned' : 'Active'}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        {!isBanned && (
          <button
            onClick={onDeactivate}
            disabled={saving}
            className="text-xs text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            Deactivate
          </button>
        )}
      </td>
    </tr>
  );
}
