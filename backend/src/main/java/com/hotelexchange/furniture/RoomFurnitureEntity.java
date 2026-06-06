package com.hotelexchange.furniture;

import com.hotelexchange.room.RoomEntity;
import com.hotelexchange.user.UserEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
        name = "room_furniture",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_room_furniture_room_catalog_position",
                columnNames = {"room_id", "catalog_item_id", "x", "y", "z", "rotation"}
        )
)
public class RoomFurnitureEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    protected RoomFurnitureEntity() {
    }

    public RoomFurnitureEntity(
            RoomEntity room,
            FurnitureCatalogEntity catalogItem,
            UserEntity ownerUser,
            int x,
            int y,
            BigDecimal z,
            String rotation
    ) {
        this.room = room;
        this.catalogItem = catalogItem;
        this.ownerUser = ownerUser;
        this.x = x;
        this.y = y;
        this.z = z != null ? z : BigDecimal.ZERO;
        this.rotation = rotation != null ? rotation : "SE";
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private RoomEntity room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "catalog_item_id", nullable = false)
    private FurnitureCatalogEntity catalogItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private UserEntity ownerUser;

    @Column(nullable = false)
    private int x;

    @Column(nullable = false)
    private int y;

    @Column(nullable = false, precision = 8, scale = 3)
    private BigDecimal z;

    @Column(nullable = false, length = 8)
    private String rotation;

    @Column(nullable = false)
    private String state;

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
        if (state == null || state.isBlank()) {
            state = "{}";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public RoomEntity getRoom() {
        return room;
    }

    public FurnitureCatalogEntity getCatalogItem() {
        return catalogItem;
    }

    public UserEntity getOwnerUser() {
        return ownerUser;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public BigDecimal getZ() {
        return z;
    }

    public String getRotation() {
        return rotation;
    }

    public String getState() {
        return state;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
