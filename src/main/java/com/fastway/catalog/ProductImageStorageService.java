package com.fastway.catalog;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/** Supabase Storage adapter. The admin upload API remains /api/admin/upload-image. */
@Service @RequiredArgsConstructor
public class ProductImageStorageService {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    @Value("${supabase.storage.enabled:false}") private boolean enabled;
    @Value("${supabase.url:}") private String supabaseUrl;
    @Value("${supabase.service-role-key:}") private String serviceRoleKey;
    @Value("${supabase.storage.bucket:product-images}") private String bucket;

    public String upload(MultipartFile file) throws IOException {
        validate(file);
        if (enabled && !supabaseUrl.isBlank() && !serviceRoleKey.isBlank()) {
            try {
                String extension = extension(file.getOriginalFilename());
                String objectName = "products/" + UUID.randomUUID() + "." + extension;
                // Upload endpoint
                String endpoint = trimSlash(supabaseUrl) + "/storage/v1/object/" + bucket + "/" + objectName;
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.parseMediaType(
                    file.getContentType() != null ? file.getContentType() : "image/jpeg"));
                headers.setBearerAuth(serviceRoleKey);
                headers.set("apikey", serviceRoleKey);
                headers.set("x-upsert", "true"); // allow re-upload of same name

                ResponseEntity<String> response = new RestTemplate().postForEntity(
                    endpoint, new HttpEntity<>(file.getBytes(), headers), String.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    // Supabase public URL format
                    String publicUrl = trimSlash(supabaseUrl) + "/storage/v1/object/public/" + bucket + "/" + objectName;
                    System.out.println("Supabase upload success: " + publicUrl);
                    return publicUrl;
                } else {
                    System.err.println("Supabase upload returned status: " + response.getStatusCode() + " body: " + response.getBody());
                }
            } catch (Exception ex) {
                System.err.println("Supabase upload failed: " + ex.getMessage());
                ex.printStackTrace();
            }
        } else {
            System.out.println("Supabase storage disabled or not configured. enabled=" + enabled
                + " url=" + (supabaseUrl.isBlank() ? "MISSING" : "set")
                + " key=" + (serviceRoleKey.isBlank() ? "MISSING" : "set"));
        }
        
        // Local storage fallback (using absolute project root)
        String userDir = System.getProperty("user.dir");
        java.io.File uploadDir = new java.io.File(userDir, "uploads");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        String extension = extension(file.getOriginalFilename());
        String fileName = UUID.randomUUID().toString() + "." + extension;
        java.io.File dest = new java.io.File(uploadDir, fileName);
        file.transferTo(dest.getAbsoluteFile());
        
        String rawUrl;
        try {
            rawUrl = org.springframework.web.servlet.support.ServletUriComponentsBuilder
                    .fromCurrentContextPath()
                    .build()
                    .toUriString() + "/uploads/" + fileName;
        } catch (Exception e) {
            rawUrl = "https://fastway-10-min-service.onrender.com/uploads/" + fileName;
        }
        return com.fastway.common.util.ImageUrlUtil.normalizeUrl(rawUrl);
    }
    private void validate(MultipartFile file) { if (file == null || file.isEmpty()) throw new IllegalArgumentException("Image file is required"); if (file.getSize() > MAX_BYTES) throw new IllegalArgumentException("Image must be 5MB or smaller"); String type=file.getContentType()==null?"":file.getContentType().toLowerCase(Locale.ROOT); if(!ALLOWED_TYPES.contains(type)||!ALLOWED_EXTENSIONS.contains(extension(file.getOriginalFilename())))throw new IllegalArgumentException("Only JPG, PNG, and WEBP images are allowed"); }
    private String extension(String name){return name==null||!name.contains(".")?"":name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);}
    private String encode(String value){return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+","%20");}
    private String encodePath(String path){return path.replace(" ","%20");}
    private String trimSlash(String value){return value.endsWith("/")?value.substring(0,value.length()-1):value;}
}
