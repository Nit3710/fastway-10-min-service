package com.fastway.address;

import com.fastway.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/serviceable-pincodes")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminServiceablePincodeController {
    private final AdminServiceablePincodeService service;
    @GetMapping public ResponseEntity<ApiResponse<Page<ServiceablePincode>>> list(@RequestParam(required=false) String search, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) { return ResponseEntity.ok(ApiResponse.success(service.list(search,page,size), "Serviceable pincodes retrieved")); }
    @PostMapping public ResponseEntity<ApiResponse<ServiceablePincode>> create(@Valid @RequestBody Request request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(request.pincode, request.deliveryCharge, request.isActive), "Serviceable pincode created")); }
    @PutMapping("/{pincode}") public ResponseEntity<ApiResponse<ServiceablePincode>> update(@PathVariable String pincode, @RequestBody Request request) { return ResponseEntity.ok(ApiResponse.success(service.update(pincode, request.deliveryCharge, request.isActive), "Serviceable pincode updated")); }
    @DeleteMapping("/{pincode}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String pincode) { service.deactivate(pincode); return ResponseEntity.ok(ApiResponse.success(null, "Serviceable pincode deactivated")); }
    @PostMapping("/bulk-upload") public ResponseEntity<ApiResponse<Map<String,Object>>> bulk(@RequestParam("file") MultipartFile file) throws Exception { return ResponseEntity.ok(ApiResponse.success(service.bulkUpload(file), "Bulk upload processed")); }
    @Data public static class Request { private String pincode; @JsonProperty("delivery_charge") private BigDecimal deliveryCharge; @JsonProperty("is_active") private Boolean isActive; }
}
