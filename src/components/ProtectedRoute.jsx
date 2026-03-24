import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessRoute } from '../config/constants';

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeleton h-8 w-32" />
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/" replace />;

  const roles = user.publicMetadata?.role;
  if (!canAccessRoute(roles, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
