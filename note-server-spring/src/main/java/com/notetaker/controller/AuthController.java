package com.notetaker.controller;

import com.notetaker.dto.JwtResponse;
import com.notetaker.dto.LoginRequest;
import com.notetaker.dto.SignUpRequest;
import com.notetaker.model.User;
import com.notetaker.repository.UserRepository;
import com.notetaker.security.CustomUserDetails;
import com.notetaker.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtil jwtUtil;

    @PostMapping("/Login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            System.out.println("🔐 [Auth] Attempting login for email: " + loginRequest.getEmail());
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

            System.out.println("✅ [Auth] Login successful for email: " + loginRequest.getEmail());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtil.generateJwtToken(authentication);
            
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

            return ResponseEntity.ok(new JwtResponse(jwt,
                    userDetails.getId(),
                    userDetails.getName(),
                    userDetails.getUsername()));
        } catch (Exception e) {
            System.err.println("❌ [Auth] Login failed for email: " + loginRequest.getEmail());
            e.printStackTrace();
            return ResponseEntity.status(401).body(Map.of("message", "Authentication failed: " + e.getMessage()));
        }
    }

    @PostMapping("/SignUp")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", "Error: Email is already in use!"));
        }

        User user = new User();
        user.setName(signUpRequest.getName());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "User registered successfully!"));
    }
}
