package com.hotelexchange.inventory;

import com.hotelexchange.furniture.FurnitureCatalogEntity;
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
import java.time.Instant;

@Entity
@Table(
        name = "user_inventory",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_inventory_user_catalog",
                columnNames = {"user_id", "catalog_item_id"}
        )
)
public class UserInventoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "catalog_item_id", nullable = false)
    private FurnitureCatalogEntity catalogItem;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, length = 40)
    private String source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserInventoryEntity() {
    }

    public UserInventoryEntity(
            UserEntity user,
            FurnitureCatalogEntity catalogItem,
            int quantity,
            String source
    ) {
        this.user = user;
        this.catalogItem = catalogItem;
        setQuantity(quantity);
        this.source = source == null || source.isBlank() ? "SEED" : source.trim();
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (source == null || source.isBlank()) {
            source = "SEED";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public FurnitureCatalogEntity getCatalogItem() {
        return catalogItem;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        if (quantity < 0) {
            throw new IllegalArgumentException("Inventory quantity cannot be negative");
        }
        this.quantity = quantity;
    }

    public String getSource() {
        return source;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
