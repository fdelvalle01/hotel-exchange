import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LogIn } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../services/httpClient';
import { getPublicStatus } from '../services/status.service';
import { useSession } from '../state/session';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useSession();
  const [username, setUsername] = useState('trader');
  const [password, setPassword] = useState('trader');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [managersOnline, setManagersOnline] = useState(2);

  useEffect(() => {
    let cancelled = false;

    async function refreshStatus() {
      try {
        const status = await getPublicStatus();
        if (!cancelled) {
          setManagersOnline(status.managersOnline);
        }
      } catch {
        if (!cancelled) {
          setManagersOnline((current) => current);
        }
      }
    }

    refreshStatus();
    const intervalId = window.setInterval(refreshStatus, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const onlineLabel = useMemo(() => {
    const managerWord = managersOnline === 1 ? 'manager' : 'managers';
    return `${managersOnline} ${managerWord} online`;
  }, [managersOnline]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (exception) {
      const message = exception instanceof ApiError ? exception.message : 'Login failed.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-cloud cloud-one" aria-hidden="true" />
      <div className="login-cloud cloud-two" aria-hidden="true" />
      <section className="login-panel habbo-window" aria-labelledby="login-title">
        <header className="habbo-window-header">
          <span>Hotel Exchange Login</span>
          <span className="habbo-window-control" aria-hidden="true">x</span>
        </header>

        <div className="login-window-body">
          <div className="pixel-logo" id="login-title">HOTEL EXCHANGE</div>
          <p className="login-subtitle">Virtual Trading Hotel</p>
          <p className="online-counter" aria-live="polite">
            <span className="online-light" aria-hidden="true" />
            {onlineLabel}
          </p>

          <form className="form-stack login-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                autoComplete="username"
                maxLength={64}
                onChange={(event) => setUsername(event.target.value)}
                value={username}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                maxLength={128}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button login-button" disabled={isSubmitting} type="submit">
              <LogIn size={18} aria-hidden="true" />
              <span>{isSubmitting ? 'Entering' : 'Enter lobby'}</span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
