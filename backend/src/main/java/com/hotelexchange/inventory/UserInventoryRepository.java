package com.hotelexchange.inventory;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserInventoryRepository extends JpaRepository<UserInventoryEntity, Long> {

    @Query("""
            select inventory
            from UserInventoryEntity inventory
            join fetch inventory.catalogItem catalogItem
            where inventory.user.id = :userId
            order by catalogItem.name asc, inventory.createdAt asc
            """)
    List<UserInventoryEntity> findInventoryForUser(@Param("userId") Long userId);

    boolean existsByUser_IdAndCatalogItem_Id(Long userId, Long catalogItemId);

    @Query("""
            select i from UserInventoryEntity i
            join fetch i.catalogItem
            where i.user.id = :userId and i.catalogItem.id = :catalogItemId
            """)
    java.util.Optional<UserInventoryEntity> findInventoryItemForUserAndCatalog(
            @Param("userId") Long userId,
            @Param("catalogItemId") Long catalogItemId
    );
}
