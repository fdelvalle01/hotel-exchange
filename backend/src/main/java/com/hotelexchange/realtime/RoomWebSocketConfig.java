package com.hotelexchange.realtime;

import com.hotelexchange.config.AppProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class RoomWebSocketConfig implements WebSocketConfigurer {

    private final AppProperties properties;
    private final RoomWebSocketHandler roomWebSocketHandler;

    public RoomWebSocketConfig(AppProperties properties, RoomWebSocketHandler roomWebSocketHandler) {
        this.properties = properties;
        this.roomWebSocketHandler = roomWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(roomWebSocketHandler, "/ws/rooms/*")
                .setAllowedOriginPatterns(properties.getCors().asList().toArray(String[]::new));
    }
}
