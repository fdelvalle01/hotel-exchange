import { DoorOpen, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../state/session';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { logout, user } = useSession();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <DoorOpen size={22} aria-hidden="true" />
          <span>Hotel Exchange</span>
        </Link>
        <div className="topbar-actions">
          <span className="user-chip">{user?.displayName ?? user?.username}</span>
          <button className="icon-button" type="button" onClick={handleLogout} title="Logout">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
