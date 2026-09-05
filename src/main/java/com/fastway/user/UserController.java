package com.fastway.user;

import com.fastway.auth.AuthService;
import com.fastway.auth.dto.UserResponse;
import com.fastway.catalog.ProductImageStorageService;
import com.fastway.common.dto.ApiResponse;
import com.fastway.config.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ProductImageStorageService storageService;
    private final AuthService authService;

    @PostMapping(value = "/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserResponse>> uploadProfilePicture(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestPart("file") MultipartFile file) throws Exception {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized"));
        }

        User currentUser = userDetails.getUser();
        
        // Upload file to Supabase using storage service
        String imageUrl = storageService.upload(file);

        // Update user profile picture in database
        currentUser.setProfilePictureUrl(imageUrl);
        userRepository.save(currentUser);

        UserResponse userResponse = authService.mapToUserResponse(currentUser);
        return ResponseEntity.ok(ApiResponse.success(userResponse, "Profile picture updated successfully"));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody com.fastway.user.dto.UpdateProfileRequest request) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized"));
        }

        User currentUser = userDetails.getUser();
        
        if (request.getName() != null && !request.getName().isBlank()) {
            currentUser.setName(request.getName().trim());
        }
        if (request.getEmail() != null) {
            currentUser.setEmail(request.getEmail().trim().isEmpty() ? null : request.getEmail().trim());
        }
        
        userRepository.save(currentUser);

        UserResponse userResponse = authService.mapToUserResponse(currentUser);
        return ResponseEntity.ok(ApiResponse.success(userResponse, "Profile details updated successfully"));
    }
}
