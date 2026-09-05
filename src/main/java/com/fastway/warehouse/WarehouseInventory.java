package com.fastway.warehouse;

import com.fastway.catalog.Product;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name="warehouse_inventory", uniqueConstraints=@UniqueConstraint(columnNames={"warehouse_id","product_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WarehouseInventory {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="warehouse_id",nullable=false) private Warehouse warehouse;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="product_id",nullable=false) private Product product;
    @Column(name="stock_qty",nullable=false) @Builder.Default private Integer stockQty=0;
}
