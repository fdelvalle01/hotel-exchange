package com.hotelexchange.auth;

import com.hotelexchange.error.RateLimitExceededException;
import com.hotelexchange.error.UnauthorizedException;
import com.hotelexchange.security.JwtService;
import com.hotelexchange.security.JwtToken;
import com.hotelexchange.user.UserEntity;
import com.hotelexchange.user.UserRepository;
import com.hotelexchange.user.UserResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthenticationService {

    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public AuthenticationService(
            JwtService jwtService,
            LoginRateLimiter loginRateLimiter,
            PasswordEncoder passwordEncoder,
            UserRepository userRepository
    ) {
        this.jwtService = jwtService;
        this.loginRateLimiter = loginRateLimiter;
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request, String clientKey) {
        if (loginRateLimiter.isBlocked(clientKey)) {
            throw new RateLimitExceededException("Too many login attempts. Try again later.");
        }

        UserEntity user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> failedLogin(clientKey));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw failedLogin(clientKey);
        }

        loginRateLimiter.clear(clientKey);
        JwtToken jwtToken = jwtService.issueToken(user);
        return new AuthResponse(jwtToken.token(), jwtToken.expiresAt(), UserResponse.from(user));
    }

    private UnauthorizedException failedLogin(String clientKey) {
        loginRateLimiter.recordFailure(clientKey);
        return new UnauthorizedException("Invalid username or password");
    }
}
