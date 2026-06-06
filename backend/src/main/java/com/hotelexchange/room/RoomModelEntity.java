package com.hotelexchange.room;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "room_models")
public class RoomModelEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80, unique = true)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(name = "floor_map", nullable = false, columnDefinition = "TEXT")
    private String floorMap;

    @Column(name = "wall_mode", nullable = false, length = 40)
    private String wallMode;

    @Column(name = "wall_height", nullable = false)
    private int wallHeight;

    @Column(name = "spawn_x", nullable = false)
    private int spawnX;

    @Column(name = "spawn_y", nullable = false)
    private int spawnY;

    @Column(name = "spawn_direction", nullable = false, length = 8)
    private String spawnDirection;

    @Column(nullable = false, length = 40)
    private String theme;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public int getWidth() { return width; }
    public int getHeight() { return height; }
    public String getFloorMap() { return floorMap; }
    public String getWallMode() { return wallMode; }
    public int getWallHeight() { return wallHeight; }
    public int getSpawnX() { return spawnX; }
    public int getSpawnY() { return spawnY; }
    public String getSpawnDirection() { return spawnDirection; }
    public String getTheme() { return theme; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
