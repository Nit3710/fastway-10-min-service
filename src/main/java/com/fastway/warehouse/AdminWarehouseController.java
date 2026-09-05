package com.fastway.warehouse;
import com.fastway.common.dto.ApiResponse; import lombok.*; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/admin/warehouses") @PreAuthorize("hasRole('ADMIN')") @RequiredArgsConstructor
public class AdminWarehouseController {
 private final WarehouseService service;
 @GetMapping public ResponseEntity<ApiResponse<List<Warehouse>>> all(){return ResponseEntity.ok(ApiResponse.success(service.all(),"Warehouses retrieved"));}
 @PostMapping public ResponseEntity<ApiResponse<Warehouse>> create(@RequestBody Warehouse w){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.save(w),"Warehouse created"));}
 @PutMapping("/{id}") public ResponseEntity<ApiResponse<Warehouse>> update(@PathVariable Long id,@RequestBody Warehouse w){w.setId(id);return ResponseEntity.ok(ApiResponse.success(service.save(w),"Warehouse updated"));}
 @DeleteMapping("/{id}") public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id){service.deactivate(id);return ResponseEntity.ok(ApiResponse.success(null,"Warehouse deactivated"));}
 @GetMapping("/{id}/inventory") public ResponseEntity<ApiResponse<List<WarehouseInventory>>> inventory(@PathVariable Long id){return ResponseEntity.ok(ApiResponse.success(service.stock(id),"Inventory retrieved"));}
 @PutMapping("/{id}/inventory/{productId}") public ResponseEntity<ApiResponse<WarehouseInventory>> stock(@PathVariable Long id,@PathVariable Long productId,@RequestBody StockRequest r){return ResponseEntity.ok(ApiResponse.success(service.updateStock(id,productId,r.stockQty),"Stock updated"));}
 @PostMapping("/{id}/inventory/bulk") public ResponseEntity<ApiResponse<Integer>> bulk(@PathVariable Long id,@RequestBody List<StockRequest> rows){rows.forEach(r->service.updateStock(id,r.productId,r.stockQty));return ResponseEntity.ok(ApiResponse.success(rows.size(),"Inventory bulk updated"));}
 @Data public static class StockRequest {private Long productId; private Integer stockQty;}
}
