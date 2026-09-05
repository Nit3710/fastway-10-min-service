package com.fastway.catalog;

import com.fastway.catalog.dto.ImageUploadResponse;
import com.fastway.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class ProductImageController {
    private final ProductImageStorageService storageService;

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ImageUploadResponse>> uploadImage(@RequestPart("file") MultipartFile file) throws Exception {
        String url = storageService.upload(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(new ImageUploadResponse(url), "Image uploaded successfully"));
    }
}
