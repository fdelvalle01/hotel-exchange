package com.hotelexchange.config;

import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {

    private final AppProperties properties;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public DataSeeder(
            AppProperties properties,
            PasswordEncoder passwordEncoder,
            UserRepository userRepository
    ) {
        this.properties = properties;
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedUser(properties.getSeed().getTestUsername(), properties.getSeed().getTestPassword());
        seedUser(properties.getSeed().getSecondTestUsername(), properties.getSeed().getSecondTestPassword());
    }

    private void seedUser(String rawUsername, String rawPassword) {
        String username = rawUsername.trim();
        if (userRepository.existsByUsername(username)) {
            return;
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setDisplayName(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }
}
