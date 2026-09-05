package com.fastway.warehouse;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface WarehouseInventoryRepository extends JpaRepository<WarehouseInventory,Long> {
    Optional<WarehouseInventory> findByWarehouseIdAndProductId(Long warehouseId, Long productId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select i from WarehouseInventory i where i.warehouse.id=:warehouseId and i.product.id=:productId") Optional<WarehouseInventory> findForUpdate(@Param("warehouseId") Long warehouseId,@Param("productId") Long productId);
    List<WarehouseInventory> findByWarehouseId(Long warehouseId);
}
