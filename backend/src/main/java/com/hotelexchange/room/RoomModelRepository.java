package com.hotelexchange.room;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomModelRepository extends JpaRepository<RoomModelEntity, Long> {

    Optional<RoomModelEntity> findByCode(String code);
}
