package com.fastway.address;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ServiceablePincodeRepository extends JpaRepository<ServiceablePincode, String> {
    Optional<ServiceablePincode> findByPincodeAndIsActiveTrue(String pincode);
    Page<ServiceablePincode> findByPincodeContaining(String pincode, Pageable pageable);
}
