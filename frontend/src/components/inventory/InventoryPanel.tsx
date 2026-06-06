import { useEffect, useState } from 'react';
import { ApiError } from '../../services/httpClient';
import { getMyInventory } from '../../services/inventory.service';
import type { InventoryItem } from '../../types/api.types';
import { InventoryItemCard } from './InventoryItemCard';

interface Props {
  onClose: () => void;
  onPlace?: (item: InventoryItem) => void;
  token: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

export function InventoryPanel({ onClose, onPlace, token }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState('loading');
      setErrorMsg('');
      try {
        const response = await getMyInventory(token);
        if (!cancelled) {
          setItems(response.items);
          setLoadState('loaded');
        }
      } catch (error) {
        if (!cancelled) {
          const msg =
            error instanceof ApiError ? error.message : 'Could not load inventory.';
          setErrorMsg(msg);
          setLoadState('error');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="inventory-panel habbo-window">
      <div className="habbo-window-header">
        <span>Inventory</span>
        <button
          aria-label="Close inventory"
          className="habbo-window-control"
          onClick={onClose}
          type="button"
        >
          X
        </button>
      </div>

      <div className="inventory-panel-body">
        {loadState === 'loading' && (
          <p className="inventory-state-msg">Loading...</p>
        )}
        {loadState === 'error' && (
          <p className="inventory-state-msg inventory-error">{errorMsg}</p>
        )}
        {loadState === 'loaded' && items.length === 0 && (
          <p className="inventory-state-msg inventory-empty">Your inventory is empty.</p>
        )}
        {loadState === 'loaded' && items.length > 0 && (
          <div className="inventory-grid">
            {items.map((item) => (
              <InventoryItemCard item={item} key={item.id} onPlace={onPlace} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
