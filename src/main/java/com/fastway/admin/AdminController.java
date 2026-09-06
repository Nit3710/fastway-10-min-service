package com.fastway.admin;

import com.fastway.common.dto.ApiResponse;
import com.fastway.delivery.DeliveryPartner;
import com.fastway.delivery.DeliveryPartnerRepository;
import com.fastway.order.OrderRepository;
import com.fastway.payment.Payment;
import com.fastway.payment.PaymentRepository;
import com.fastway.user.User;
import com.fastway.user.UserRepository;
import com.fastway.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    // ── Dashboard Stats ──────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalOrders", orderRepository.count());
        stats.put("totalDeliveryPartners", deliveryPartnerRepository.count());
        stats.put("totalRevenue", paymentRepository.sumPaidAmount());
        // Do not return JPA Order entities directly: lazy Hibernate proxies can make
        // Jackson fail with ByteBuddyInterceptor errors and also expose too much data.
        stats.put("recentOrders", orderRepository.findAll(
            PageRequest.of(0, 5, Sort.by("createdAt").descending())
        ).getContent().stream().map(order -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", order.getId());
            row.put("user", Map.of("id", order.getUser().getId(), "name",
                    order.getUser().getName() == null ? "" : order.getUser().getName()));
            row.put("totalAmount", order.getTotalAmount());
            row.put("paymentMode", order.getPaymentMode());
            row.put("paymentStatus", order.getPaymentStatus());
            row.put("status", order.getStatus());
            row.put("createdAt", order.getCreatedAt());
            return row;
        }).collect(Collectors.toList()));
        return ResponseEntity.ok(ApiResponse.success(stats, "Dashboard stats loaded"));
    }

    // ── Users ────────────────────────────────────────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<User>>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Page<User> users;
        if (role != null) {
            users = userRepository.findByRole(UserRole.valueOf(role.toUpperCase()),
                    PageRequest.of(page, size, Sort.by("id").descending()));
        } else {
            users = userRepository.findAll(
                    PageRequest.of(page, size, Sort.by("id").descending()));
        }
        return ResponseEntity.ok(ApiResponse.success(users, "Users retrieved"));
    }

    // ── Delivery Partners ────────────────────────────────────────────────────
    public record DeliveryPartnerDto(
        Long id,
        String name,
        String phone,
        String vehicleType,
        Boolean isActive,
        Boolean isAvailable,
        Double currentLat,
        Double currentLng
    ) {}

    @GetMapping("/delivery-partners")
    public ResponseEntity<ApiResponse<List<DeliveryPartnerDto>>> getAllDeliveryPartners() {
        List<DeliveryPartnerDto> partners = deliveryPartnerRepository.findAll(
                Sort.by("id").descending())
                .stream()
                .map(dp -> new DeliveryPartnerDto(
                        dp.getId(),
                        dp.getUser().getName(),
                        dp.getUser().getPhone(),
                        dp.getVehicleType(),
                        dp.getIsActive(),
                        dp.getIsAvailable(),
                        dp.getCurrentLat(),
                        dp.getCurrentLng()
                )).toList();
        return ResponseEntity.ok(ApiResponse.success(partners, "Delivery partners retrieved"));
    }

    public record CreateDeliveryPartnerRequest(
        String name,
        String phone,
        String password,
        String vehicleType
    ) {}

    @PostMapping("/delivery-partners")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<DeliveryPartnerDto>> createDeliveryPartner(
            @RequestBody CreateDeliveryPartnerRequest request
    ) {
        if (request.phone() == null || request.phone().isBlank()) {
            throw new IllegalArgumentException("Phone number is required");
        }
        if (userRepository.existsByPhone(request.phone())) {
            throw new IllegalArgumentException("Phone number is already registered");
        }

        String rawPassword = (request.password() != null && !request.password().isBlank())
                ? request.password()
                : "123456";

        User user = User.builder()
                .name(request.name() != null && !request.name().isBlank() ? request.name() : "Rider " + request.phone().substring(Math.max(0, request.phone().length() - 4)))
                .phone(request.phone())
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(UserRole.DELIVERY_PARTNER)
                .build();

        user = userRepository.save(user);

        DeliveryPartner dp = DeliveryPartner.builder()
                .user(user)
                .vehicleType(request.vehicleType() != null && !request.vehicleType().isBlank() ? request.vehicleType() : "Motorbike")
                .isActive(true)
                .isAvailable(true)
                .build();

        dp = deliveryPartnerRepository.save(dp);

        DeliveryPartnerDto dto = new DeliveryPartnerDto(
                dp.getId(),
                user.getName(),
                user.getPhone(),
                dp.getVehicleType(),
                dp.getIsActive(),
                dp.getIsAvailable(),
                dp.getCurrentLat(),
                dp.getCurrentLng()
        );

        return ResponseEntity.ok(ApiResponse.success(dto, "Delivery partner created successfully"));
    }

    // ── Payments ─────────────────────────────────────────────────────────────
    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<Page<Payment>>> getAllPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Page<Payment> payments = paymentRepository.findAll(
                PageRequest.of(page, size, Sort.by("id").descending()));
        return ResponseEntity.ok(ApiResponse.success(payments, "Payments retrieved"));
    }
}
