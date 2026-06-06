package com.hotelexchange.inventory;

import com.hotelexchange.error.NotFoundException;
import com.hotelexchange.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserInventoryService {

    private final UserInventoryRepository userInventoryRepository;
    private final UserRepository userRepository;

    public UserInventoryService(
            UserInventoryRepository userInventoryRepository,
            UserRepository userRepository
    ) {
        this.userInventoryRepository = userInventoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public InventoryResponseDto getInventoryForUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new NotFoundException("User not found");
        }

        return new InventoryResponseDto(
                userInventoryRepository.findInventoryForUser(userId).stream()
                        .map(InventoryItemDto::from)
                        .toList()
        );
    }
}
