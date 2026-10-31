package com.elearning.config;

import com.elearning.models.User;
import com.elearning.repositories.UserRepository;
import com.elearning.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Value("${app.frontendurl}")
    private String frontendUrl;

    public WebSocketConfig(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(frontendUrl, "http://localhost:*", "http://127.0.0.1:*",
                        "https://*.bitecodes.com", "https://bitecodes.com")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) {
                    return message;
                }

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String header = accessor.getFirstNativeHeader("Authorization");
                    if (header != null && header.startsWith("Bearer ")) {
                        String jwt = header.substring(7);
                        if (jwtService.isTokenValid(jwt)) {
                            String email = jwtService.getUsernameFromToken(jwt);
                            User userEntity = userRepository.findByEmailIgnoreCase(email).orElse(null);
                            if (userEntity != null && userEntity.isEnabled()) {
                                accessor.setUser(new UsernamePasswordAuthenticationToken(
                                        email, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
                            }
                        }
                    }
                    return message;
                }

                Principal user = accessor.getUser();
                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    if (user == null || !canAccessDestination(user, accessor.getDestination())) {
                        return null;
                    }
                }
                if (StompCommand.SEND.equals(accessor.getCommand()) && user == null) {
                    return null;
                }
                return message;
            }
        });
    }

    private boolean canAccessDestination(Principal user, String destination) {
        if (destination == null) {
            return true;
        }
        String prefix = "/topic/messages/";
        if (!destination.startsWith(prefix)) {
            return true;
        }
        String pair = destination.substring(prefix.length());
        String[] parts = pair.split("-");
        if (parts.length != 2) {
            return false;
        }
        User userEntity = userRepository.findByEmailIgnoreCase(user.getName()).orElse(null);
        if (userEntity == null) {
            return false;
        }
        String id = String.valueOf(userEntity.getId());
        return id.equals(parts[0]) || id.equals(parts[1]);
    }
}
