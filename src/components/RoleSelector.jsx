import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn, useUser } from '@clerk/clerk-react';
import { getAllowedPaths, CLERK_PUBLISHABLE_KEY } from '../config/constants';

const chartIcon = (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
  </svg>
);

const buildingIcon = (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
  </svg>
);

const sunIcon = (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const userIcon = (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const gearIcon = (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const dollarIcon = (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const allRoleCards = [
  { path: '/ceo', title: 'CEO', description: 'Company-wide overview', icon: chartIcon },
  { path: '/manager/new-york', title: 'Manager NYC', description: 'New York location metrics', icon: buildingIcon },
  { path: '/manager/miami', title: 'Manager MIA', description: 'Miami location metrics', icon: sunIcon },
  { path: '/advisor/new-york', title: 'Advisor NYC', description: 'New York sales & students', icon: userIcon },
  { path: '/advisor/miami', title: 'Advisor MIA', description: 'Miami sales & students', icon: userIcon },
  { path: '/rep/new-york', title: 'Rep NYC', description: 'Your commission & clients', icon: dollarIcon },
  { path: '/rep/miami', title: 'Rep MIA', description: 'Your commission & clients', icon: dollarIcon },
  { path: '/admin', title: 'Admin', description: 'Manage users & roles', icon: gearIcon },
];

const clerkAppearance = {
  variables: {
    colorPrimary: '#3B82F6',
    colorBackground: '#1E293B',
    colorInputBackground: '#0F172A',
    colorText: '#F1F5F9',
    colorTextSecondary: '#94A3B8',
    colorInputText: '#F1F5F9',
    borderRadius: '0.75rem',
  },
  elements: {
    card: 'shadow-xl border border-[#334155]',
    formButtonPrimary: 'bg-[#3B82F6] hover:bg-[#2563EB]',
  },
};

function TitleBlock() {
  return (
    <div className="mb-10 text-center">
      <h1
        className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-2 uppercase tracking-[0.25em]"
        style={{ fontFamily: "'Open Sans', sans-serif" }}
      >
        Skylar&ensp;Modeling
      </h1>
    </div>
  );
}

export default function RoleSelector() {
  const navigate = useNavigate();

  // If no Clerk key, show all cards (dev mode / no auth)
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <TitleBlock />
        <p className="text-[var(--color-text-secondary)] text-lg mb-8">Select your dashboard view</p>
        <RoleCards cards={allRoleCards.filter((c) => c.path !== '/admin')} navigate={navigate} />
      </div>
    );
  }

  return <AuthenticatedSelector />;
}

function AuthenticatedSelector() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();

  const roles = isSignedIn ? user.publicMetadata?.role : null;
  const allowedPaths = getAllowedPaths(roles);
  const visibleCards = allRoleCards.filter((c) => allowedPaths.includes(c.path));

  // Auto-redirect if user only has 1 dashboard view
  useEffect(() => {
    if (isLoaded && isSignedIn && visibleCards.length === 1) {
      navigate(visibleCards[0].path, { replace: true });
    }
  }, [isLoaded, isSignedIn, visibleCards, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <TitleBlock />
        <div className="skeleton h-64 w-80" />
      </div>
    );
  }

  // Not signed in — show sign-in form
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <TitleBlock />
        <SignIn appearance={clerkAppearance} />
      </div>
    );
  }

  // No role assigned yet
  if (visibleCards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <TitleBlock />
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center max-w-md">
          <p className="text-[var(--color-text-primary)] mb-2">No role assigned yet</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Contact your administrator to get access to the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <TitleBlock />
      <p className="text-[var(--color-text-secondary)] text-lg mb-8">Select your dashboard view</p>
      <RoleCards cards={visibleCards} navigate={navigate} />
    </div>
  );
}

function RoleCards({ cards, navigate }) {
  // Group cards by type
  const groups = [];
  const ceoCards = cards.filter((c) => c.path === '/ceo');
  const mgrCards = cards.filter((c) => c.path.startsWith('/manager'));
  const advCards = cards.filter((c) => c.path.startsWith('/advisor'));
  const repCards = cards.filter((c) => c.path.startsWith('/rep'));
  const adminCards = cards.filter((c) => c.path === '/admin');

  if (ceoCards.length) groups.push({ label: null, roles: ceoCards });
  if (mgrCards.length) groups.push({ label: 'Manager', roles: mgrCards });
  if (advCards.length) groups.push({ label: 'Advisor', roles: advCards });
  if (repCards.length) groups.push({ label: 'Sales Rep', roles: repCards });
  if (adminCards.length) groups.push({ label: null, roles: adminCards });

  return (
    <div className="w-full max-w-4xl space-y-8">
      {groups.map((group, gi) => (
        <div key={group.label || `group-${gi}`}>
          {group.label && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3 ml-1">{group.label}</h2>
          )}
          <div className={`grid gap-4 ${group.roles.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {group.roles.map((role) => (
              <button
                key={role.path}
                onClick={() => navigate(role.path)}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-8 text-center hover:border-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue)]/5 transition-all duration-200 cursor-pointer group"
              >
                <div className="text-[var(--color-accent-blue)] mb-4 flex justify-center group-hover:scale-110 transition-transform">
                  {role.icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{role.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{role.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
