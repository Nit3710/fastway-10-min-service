package com.fastway.address;

import com.fastway.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminServiceablePincodeService {
    private final ServiceablePincodeRepository repository;

    public Page<ServiceablePincode> list(String search, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100), Sort.by("pincode").ascending());
        return repository.findByPincodeContaining(search == null ? "" : search.trim(), pageable);
    }

    @CacheEvict(value = "pincodes", allEntries = true)
    public ServiceablePincode create(String pincode, BigDecimal charge, Boolean active) {
        String code = normalize(pincode); validate(code, charge);
        if (repository.existsById(code)) throw new IllegalArgumentException("Pincode already exists: " + code);
        return repository.save(ServiceablePincode.builder().pincode(code).deliveryCharge(charge).isActive(active == null || active).build());
    }

    @CacheEvict(value = "pincodes", allEntries = true)
    public ServiceablePincode update(String pincode, BigDecimal charge, Boolean active) {
        ServiceablePincode zone = repository.findById(normalize(pincode)).orElseThrow(() -> new ResourceNotFoundException("Serviceable pincode not found"));
        if (charge != null) { if (charge.signum() < 0) throw new IllegalArgumentException("Delivery charge cannot be negative"); zone.setDeliveryCharge(charge); }
        if (active != null) zone.setIsActive(active);
        return repository.save(zone);
    }

    @CacheEvict(value = "pincodes", allEntries = true)
    public void deactivate(String pincode) {
        ServiceablePincode zone = repository.findById(normalize(pincode)).orElseThrow(() -> new ResourceNotFoundException("Serviceable pincode not found"));
        zone.setIsActive(false); repository.save(zone);
    }

    @CacheEvict(value = "pincodes", allEntries = true)
    public Map<String, Object> bulkUpload(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("CSV file is required");
        List<Map<String, Object>> failures = new ArrayList<>(); int succeeded = 0, row = 1;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line; boolean header = true;
            while ((line = reader.readLine()) != null) { row++; if (line.isBlank()) continue; if (header && line.toLowerCase().contains("pincode")) { header = false; continue; } header = false;
                String[] c = line.split(",", -1);
                try { if (c.length < 3) throw new IllegalArgumentException("Expected pincode, delivery_charge, is_active"); String active = c[2].trim().toLowerCase(); if (!active.equals("true") && !active.equals("false")) throw new IllegalArgumentException("is_active must be true or false"); create(c[0], new BigDecimal(c[1].trim()), Boolean.parseBoolean(active)); succeeded++; }
                catch (Exception ex) { failures.add(Map.of("row", row, "value", line, "reason", ex.getMessage() == null ? "Invalid row" : ex.getMessage())); }
            }
        }
        return Map.of("succeeded", succeeded, "failed", failures.size(), "failures", failures);
    }

    private String normalize(String pincode) { return pincode == null ? "" : pincode.trim(); }
    private void validate(String pincode, BigDecimal charge) { if (!pincode.matches("\\d{6}")) throw new IllegalArgumentException("Pincode must be exactly 6 digits"); if (charge == null || charge.signum() < 0) throw new IllegalArgumentException("Delivery charge must be zero or greater"); }
}
