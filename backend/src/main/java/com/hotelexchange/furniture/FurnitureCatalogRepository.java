package com.hotelexchange.furniture;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FurnitureCatalogRepository extends JpaRepository<FurnitureCatalogEntity, Long> {

    Optional<FurnitureCatalogEntity> findByCode(String code);
}
