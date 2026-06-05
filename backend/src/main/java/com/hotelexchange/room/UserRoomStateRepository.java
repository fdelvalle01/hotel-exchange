package com.hotelexchange.room;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoomStateRepository extends JpaRepository<UserRoomStateEntity, Long> {

    Optional<UserRoomStateEntity> findByRoom_IdAndUser_Id(Long roomId, Long userId);
}
