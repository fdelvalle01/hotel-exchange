import { Navigate } from 'react-router-dom';
import { useSession } from '../state/session';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isBootstrapping, user } = useSession();

  if (isBootstrapping) {
    return <div className="screen-loading">Loading session</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
