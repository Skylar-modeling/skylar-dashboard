import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CLERK_PUBLISHABLE_KEY } from './config/constants';
import RoleSelector from './components/RoleSelector';
import ProtectedRoute from './components/ProtectedRoute';
import CEODashboard from './pages/CEODashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdvisorDashboard from './pages/AdvisorDashboard';
import RepDashboard from './pages/RepDashboard';
import AdminPage from './pages/AdminPage';
import InboxPage from './pages/InboxPage';

export default function App() {
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelector />} />
          <Route path="/ceo" element={<CEODashboard />} />
          <Route path="/manager/:locationSlug" element={<ManagerDashboard />} />
          <Route path="/advisor/:locationSlug" element={<AdvisorDashboard />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelector />} />
          <Route path="/ceo" element={<ProtectedRoute><CEODashboard /></ProtectedRoute>} />
          <Route path="/manager/:locationSlug" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/advisor/:locationSlug" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
          <Route path="/rep/:locationSlug" element={<ProtectedRoute><RepDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          {/* SMS Inbox — any signed-in user (rep, advisor, manager, CEO). */}
          <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
