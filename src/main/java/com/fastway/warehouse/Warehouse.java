package com.fastway.warehouse;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity @Table(name="warehouses") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Warehouse {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @NotBlank @Column(nullable=false,length=120) private String name;
    @Column(length=500) private String address;
    private Double latitude;
    private Double longitude;
    @Column(name="is_active",nullable=false) @Builder.Default private Boolean isActive=true;
    @NotNull @DecimalMin("0.1") @Column(name="service_radius_km",nullable=false) @Builder.Default private Double serviceRadiusKm=5.0;
}
