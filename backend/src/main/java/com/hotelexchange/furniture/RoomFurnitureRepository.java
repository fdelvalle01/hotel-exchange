package com.hotelexchange.furniture;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomFurnitureRepository extends JpaRepository<RoomFurnitureEntity, Long> {

    @EntityGraph(attributePaths = "catalogItem")
    List<RoomFurnitureEntity> findByRoom_IdOrderByIdAsc(Long roomId);

    @EntityGraph(attributePaths = "catalogItem")
    Optional<RoomFurnitureEntity> findByIdAndRoom_Id(Long id, Long roomId);
}
