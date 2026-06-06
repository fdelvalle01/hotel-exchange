import { useState } from 'react';
import type { InventoryItem } from '../../types/api.types';

interface Props {
  item: InventoryItem;
  onPlace?: (item: InventoryItem) => void;
}

export function InventoryItemCard({ item, onPlace }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="inventory-item-card">
      <div className="inventory-preview">
        {!imgFailed ? (
          <img
            alt={item.name}
            onError={() => setImgFailed(true)}
            src={item.spritePath}
          />
        ) : (
          <span className="inventory-preview-fallback">?</span>
        )}
        <span className="inventory-qty">×{item.quantity}</span>
      </div>

      <div className="inventory-item-meta">
        <strong className="inventory-item-name">{item.name}</strong>
        <span className="inventory-item-sub">
          {item.code} · {item.width}×{item.height}
        </span>
        <div className="inventory-badges">
          {item.canSit && <span className="inventory-badge badge-seat">SEAT</span>}
          {item.canWalk && <span className="inventory-badge badge-walkable">WALKABLE</span>}
          {item.tradeable && <span className="inventory-badge badge-tradeable">TRADEABLE</span>}
          {item.blocksMovement && <span className="inventory-badge badge-blocks">BLOCKS</span>}
        </div>
      </div>

      {onPlace ? (
        <button
          className="inventory-place-action"
          onClick={() => onPlace(item)}
          type="button"
        >
          Place
        </button>
      ) : (
        <button
          className="inventory-disabled-action"
          disabled
          title="Coming soon"
          type="button"
        >
          Place
        </button>
      )}
    </div>
  );
}
