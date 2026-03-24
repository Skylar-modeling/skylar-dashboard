import { useNavigate } from 'react-router-dom';

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

const roleGroups = [
  {
    label: null,
    roles: [
      {
        path: '/ceo',
        title: 'CEO',
        description: 'Company-wide overview',
        icon: chartIcon,
      },
    ],
  },
  {
    label: 'Manager',
    roles: [
      {
        path: '/manager/new-york',
        title: 'Manager NYC',
        description: 'New York location metrics',
        icon: buildingIcon,
      },
      {
        path: '/manager/miami',
        title: 'Manager MIA',
        description: 'Miami location metrics',
        icon: sunIcon,
      },
    ],
  },
  {
    label: 'Advisor',
    roles: [
      {
        path: '/advisor/new-york',
        title: 'Advisor NYC',
        description: 'New York sales & students',
        icon: userIcon,
      },
      {
        path: '/advisor/miami',
        title: 'Advisor MIA',
        description: 'Miami sales & students',
        icon: userIcon,
      },
    ],
  },
];

export default function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-14 text-center">
        <h1
          className="text-4xl font-bold text-[var(--color-text-primary)] mb-2"
          style={{ fontFamily: "'Open Sans', sans-serif", letterSpacing: '0.35em' }}
        >
          S K Y L A R &nbsp; M O D E L I N G
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg mt-4">Select your dashboard view</p>
      </div>

      <div className="w-full max-w-4xl space-y-8">
        {roleGroups.map((group) => (
          <div key={group.label || 'ceo'}>
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
    </div>
  );
}
