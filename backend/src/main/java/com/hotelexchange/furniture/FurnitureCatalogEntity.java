package com.hotelexchange.furniture;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "furniture_catalog")
public class FurnitureCatalogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 40)
    private String type;

    @Column(name = "sprite_key", nullable = false, length = 120)
    private String spriteKey;

    @Column(name = "sprite_path", nullable = false)
    private String spritePath;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(name = "blocks_movement", nullable = false)
    private boolean blocksMovement;

    @Column(name = "can_sit", nullable = false)
    private boolean canSit;

    @Column(name = "can_walk", nullable = false)
    private boolean canWalk;

    @Column(name = "can_stack", nullable = false)
    private boolean canStack;

    @Column(name = "default_z", nullable = false, precision = 8, scale = 3)
    private BigDecimal defaultZ;

    @Column(name = "interaction_type", nullable = false, length = 40)
    private String interactionType;

    @Column(nullable = false)
    private boolean tradeable;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public String getSpriteKey() {
        return spriteKey;
    }

    public String getSpritePath() {
        return spritePath;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public boolean isBlocksMovement() {
        return blocksMovement;
    }

    public boolean isCanSit() {
        return canSit;
    }

    public boolean isCanWalk() {
        return canWalk;
    }

    public boolean isCanStack() {
        return canStack;
    }

    public BigDecimal getDefaultZ() {
        return defaultZ;
    }

    public String getInteractionType() {
        return interactionType;
    }

    public boolean isTradeable() {
        return tradeable;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
