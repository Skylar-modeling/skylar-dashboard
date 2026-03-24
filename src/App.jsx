import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RoleSelector from './components/RoleSelector';
import CEODashboard from './pages/CEODashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdvisorDashboard from './pages/AdvisorDashboard';

export default function App() {
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
