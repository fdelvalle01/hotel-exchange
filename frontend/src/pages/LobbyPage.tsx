import { useEffect, useMemo, useState } from 'react';
import { Building2, Clock3, DoorOpen, RefreshCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ApiError } from '../services/httpClient';
import { listRooms } from '../services/rooms.service';
import { useSession } from '../state/session';
import type { Room } from '../types/api.types';

interface NavigatorRoom {
  key: string;
  name: string;
  description: string;
  status: 'Open' | 'Coming soon';
  realRoom?: Room;
  fallbackSize: string;
  accent: 'teal' | 'amber' | 'coral' | 'violet' | 'green';
}

const NAVIGATOR_ROOMS: Omit<NavigatorRoom, 'realRoom'>[] = [
  {
    key: 'main-lobby',
    name: 'Main Lobby',
    description: 'Meet other managers, test movement, and start your trading hotel day.',
    status: 'Open',
    fallbackSize: '12 x 12',
    accent: 'teal',
  },
  {
    key: 'trading-floor',
    name: 'Trading Floor',
    description: 'A busy market hall for live deals, bids, and portfolio action.',
    status: 'Coming soon',
    fallbackSize: '16 x 12',
    accent: 'amber',
  },
  {
    key: 'startup-district',
    name: 'Startup District',
    description: 'Scout early-stage companies and negotiate seed-round opportunities.',
    status: 'Coming soon',
    fallbackSize: '14 x 14',
    accent: 'green',
  },
  {
    key: 'crypto-plaza',
    name: 'Crypto Plaza',
    description: 'A neon plaza for volatile assets, speculation, and market rumors.',
    status: 'Coming soon',
    fallbackSize: '13 x 13',
    accent: 'violet',
  },
  {
    key: 'santiago-exchange',
    name: 'Santiago Exchange',
    description: 'Regional exchange floor inspired by local desks and late-session moves.',
    status: 'Coming soon',
    fallbackSize: '15 x 11',
    accent: 'coral',
  },
];

export function LobbyPage() {
  const { token } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadRooms() {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setRooms(await listRooms(token));
    } catch (exception) {
      const message = exception instanceof ApiError ? exception.message : 'Could not load rooms.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, [token]);

  const navigatorRooms = useMemo<NavigatorRoom[]>(() => {
    const roomsByName = new Map(rooms.map((room) => [room.name.toLowerCase(), room]));
    const mainLobby = roomsByName.get('main lobby') ?? rooms.find((room) => room.id === 1);

    return NAVIGATOR_ROOMS.map((navigatorRoom) => {
      if (navigatorRoom.key !== 'main-lobby') {
        return navigatorRoom;
      }

      return {
        ...navigatorRoom,
        realRoom: mainLobby,
      };
    });
  }, [rooms]);

  return (
    <Layout>
      <div className="lobby-page">
        <div className="lobby-backdrop" aria-hidden="true" />
        <section className="lobby-header navigator-hero">
          <div>
            <p className="eyebrow navigator-eyebrow">Hotel Navigator</p>
            <h1>Choose a room</h1>
            <p className="navigator-copy">Browse public hotel spaces, see who is online, and jump into the live exchange floor.</p>
          </div>
          <button className="secondary-button navigator-refresh" onClick={loadRooms} type="button" title="Refresh rooms">
            <RefreshCw size={18} aria-hidden="true" />
            <span>{isLoading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </section>

        {error && <p className="surface-alert navigator-alert">{error}</p>}

        <section className="navigator-window habbo-window" aria-label="Hotel Navigator">
          <header className="habbo-window-header navigator-window-header">
            <span>Hotel Navigator</span>
            <span className="habbo-window-control" aria-hidden="true">x</span>
          </header>

          <div className="navigator-window-body">
            <div className="navigator-tabs" aria-hidden="true">
              <span className="navigator-tab active">Public Rooms</span>
              <span className="navigator-tab">Staff Picks</span>
              <span className="navigator-tab">Events</span>
            </div>

            {isLoading && <div className="screen-loading inline navigator-loading">Loading rooms</div>}

            <div className="room-list navigator-room-list">
              {navigatorRooms.map((navigatorRoom) => {
                const realRoom = navigatorRoom.realRoom;
                const isOpen = navigatorRoom.status === 'Open';
                const roomSize = realRoom
                  ? `${realRoom.width} x ${realRoom.height}`
                  : navigatorRoom.fallbackSize;
                const onlineCount = realRoom?.onlineCount ?? 0;
                const enterTo = `/rooms/${realRoom?.id ?? 1}`;

                return (
                  <article className={`room-row navigator-room-card accent-${navigatorRoom.accent}`} key={navigatorRoom.key}>
                    <div className="room-pixel-preview" aria-hidden="true">
                      <Building2 size={34} strokeWidth={2.4} />
                    </div>

                    <div className="room-card-main">
                      <div className="room-card-title-row">
                        <h2>{navigatorRoom.name}</h2>
                        <span className={isOpen ? 'room-status open' : 'room-status soon'}>
                          {navigatorRoom.status}
                        </span>
                      </div>
                      <p>{navigatorRoom.description}</p>
                      <div className="room-card-meta" aria-label={`${navigatorRoom.name} details`}>
                        <span>
                          <Building2 size={15} aria-hidden="true" />
                          {roomSize} tiles
                        </span>
                        <span>
                          <Users size={15} aria-hidden="true" />
                          {onlineCount} online
                        </span>
                      </div>
                    </div>

                    <div className="room-card-action">
                      {isOpen ? (
                        <Link className="primary-button compact navigator-enter-button" to={enterTo}>
                          <DoorOpen size={18} aria-hidden="true" />
                          <span>Enter</span>
                        </Link>
                      ) : (
                        <button className="secondary-button compact navigator-soon-button" disabled type="button">
                          <Clock3 size={18} aria-hidden="true" />
                          <span>Coming soon</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
