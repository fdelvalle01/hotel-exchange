package com.hotelexchange.room;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomBlockedTileRepository extends JpaRepository<RoomBlockedTileEntity, Long> {

    List<RoomBlockedTileEntity> findByRoom_Id(Long roomId);
}
