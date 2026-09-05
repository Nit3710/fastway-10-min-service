package com.fastway.address;

import com.fastway.address.dto.AddressRequest;
import com.fastway.address.dto.AddressResponse;
import com.fastway.address.dto.ServiceabilityResponse;
import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.user.Address;
import com.fastway.user.AddressRepository;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final ServiceablePincodeRepository serviceablePincodeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AddressResponse> getAddressesByUserId(Long userId) {
        return addressRepository.findByUserIdAndIsDeletedFalse(userId)
                .stream()
                .map(AddressResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AddressResponse createAddress(Long userId, AddressRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        boolean shouldBeDefault = Boolean.TRUE.equals(request.getIsDefault());

        if (shouldBeDefault) {
            unsetAllDefaultsForUser(userId);
        }

        Address address = Address.builder()
                .user(user)
                .addressLine(request.getAddressLine())
                .city(request.getCity())
                .pincode(request.getPincode())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .isDefault(shouldBeDefault)
                .isDeleted(false)
                .build();

        Address saved = addressRepository.save(address);
        return AddressResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(Long userId, Long addressId, AddressRequest request) {
        Address address = addressRepository.findByIdAndIsDeletedFalse(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + addressId));

        if (!address.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to modify this address");
        }

        boolean shouldBeDefault = Boolean.TRUE.equals(request.getIsDefault());

        if (shouldBeDefault && !Boolean.TRUE.equals(address.getIsDefault())) {
            unsetAllDefaultsForUser(userId);
            address.setIsDefault(true);
        } else if (!shouldBeDefault) {
            address.setIsDefault(false);
        }

        address.setAddressLine(request.getAddressLine());
        address.setCity(request.getCity());
        address.setPincode(request.getPincode());
        address.setLatitude(request.getLatitude());
        address.setLongitude(request.getLongitude());

        Address updated = addressRepository.save(address);
        return AddressResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        Address address = addressRepository.findByIdAndIsDeletedFalse(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + addressId));

        if (!address.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to delete this address");
        }

        // Soft delete to protect past order foreign key relationships
        address.setIsDeleted(true);
        address.setIsDefault(false);
        addressRepository.save(address);
    }

    @Override
    @Transactional
    public AddressResponse setDefaultAddress(Long userId, Long addressId) {
        Address address = addressRepository.findByIdAndIsDeletedFalse(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + addressId));

        if (!address.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have permission to set this address as default");
        }

        unsetAllDefaultsForUser(userId);
        address.setIsDefault(true);

        Address updated = addressRepository.save(address);
        return AddressResponse.fromEntity(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public ServiceabilityResponse checkServiceability(String pincode) {
        Optional<ServiceablePincode> optPincode = serviceablePincodeRepository.findByPincodeAndIsActiveTrue(pincode);
        if (optPincode.isPresent()) {
            return ServiceabilityResponse.builder()
                    .pincode(pincode)
                    .serviceable(true)
                    .deliveryCharge(optPincode.get().getDeliveryCharge())
                    .build();
        } else {
            return ServiceabilityResponse.builder()
                    .pincode(pincode)
                    .serviceable(false)
                    .deliveryCharge(BigDecimal.ZERO)
                    .build();
        }
    }

    private void unsetAllDefaultsForUser(Long userId) {
        List<Address> defaults = addressRepository.findByUserIdAndIsDefaultTrueAndIsDeletedFalse(userId);
        for (Address d : defaults) {
            d.setIsDefault(false);
            addressRepository.save(d);
        }
    }
}
