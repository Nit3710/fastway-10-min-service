package com.fastway.address;

import com.fastway.config.CustomUserDetails;
import com.fastway.common.dto.ApiResponse;
import com.fastway.address.dto.AddressRequest;
import com.fastway.address.dto.AddressResponse;
import com.fastway.address.dto.ServiceabilityResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AddressResponse>>> getMyAddresses(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<AddressResponse> addresses = addressService.getAddressesByUserId(userDetails.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success(addresses, "Addresses retrieved successfully"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AddressResponse>> createAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody AddressRequest request
    ) {
        AddressResponse address = addressService.createAddress(userDetails.getUser().getId(), request);
        return new ResponseEntity<>(ApiResponse.success(address, "Address created successfully"), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressResponse>> updateAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody AddressRequest request
    ) {
        AddressResponse address = addressService.updateAddress(userDetails.getUser().getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(address, "Address updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        addressService.deleteAddress(userDetails.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.success(null, "Address deleted successfully"));
    }

    @PutMapping("/{id}/default")
    public ResponseEntity<ApiResponse<AddressResponse>> setDefaultAddress(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        AddressResponse address = addressService.setDefaultAddress(userDetails.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.success(address, "Default address set successfully"));
    }

    @GetMapping("/check-serviceability")
    public ResponseEntity<ApiResponse<ServiceabilityResponse>> checkPincodeServiceability(
            @RequestParam String pincode
    ) {
        ServiceabilityResponse response = addressService.checkServiceability(pincode);
        return ResponseEntity.ok(ApiResponse.success(response, "Serviceability check completed"));
    }
}
