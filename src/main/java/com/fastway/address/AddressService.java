package com.fastway.address;

import com.fastway.address.dto.AddressRequest;
import com.fastway.address.dto.AddressResponse;
import com.fastway.address.dto.ServiceabilityResponse;

import java.util.List;

public interface AddressService {
    List<AddressResponse> getAddressesByUserId(Long userId);
    AddressResponse createAddress(Long userId, AddressRequest request);
    AddressResponse updateAddress(Long userId, Long addressId, AddressRequest request);
    void deleteAddress(Long userId, Long addressId);
    AddressResponse setDefaultAddress(Long userId, Long addressId);
    ServiceabilityResponse checkServiceability(String pincode);
}
