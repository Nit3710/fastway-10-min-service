package com.fastway.warehouse;

import com.fastway.cart.CartItem;
import com.fastway.common.exception.ResourceNotFoundException;
import com.fastway.user.Address;
import com.fastway.catalog.ProductRepository;
import com.fastway.order.OrderItem;
import lombok.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class WarehouseService {
    private final WarehouseRepository warehouses; private final WarehouseInventoryRepository inventory; private final ProductRepository products;
    public double distanceKm(double a,double b,double c,double d){ double p=Math.PI/180, x=(c-a)*p, y=(d-b)*p; double h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*p)*Math.cos(c*p)*Math.sin(y/2)*Math.sin(y/2); return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
    public int etaMinutes(Warehouse w, Address a){ return (int)Math.ceil(distanceKm(w.getLatitude(),w.getLongitude(),a.getLatitude(),a.getLongitude())/0.5+5); }
    @Transactional
    public Reservation reserve(List<CartItem> items, Address address){
        if(address.getLatitude()==null||address.getLongitude()==null) return null;
        if(warehouses.findByIsActiveTrue().isEmpty()) return null;
        List<Warehouse> candidates=warehouses.findByIsActiveTrue().stream().filter(w->w.getLatitude()!=null&&w.getLongitude()!=null&&distanceKm(w.getLatitude(),w.getLongitude(),address.getLatitude(),address.getLongitude())<=w.getServiceRadiusKm()).sorted(Comparator.comparingDouble(w->distanceKm(w.getLatitude(),w.getLongitude(),address.getLatitude(),address.getLongitude()))).toList();
        if(candidates.isEmpty()) throw new IllegalArgumentException("No dark store serves this delivery address");
        for(Warehouse w:candidates){ Map<Long,WarehouseInventory> locked=new HashMap<>(); boolean enough=true; for(CartItem item:items){ WarehouseInventory inv=inventory.findForUpdate(w.getId(),item.getProduct().getId()).orElse(null); if(inv==null||inv.getStockQty()<item.getQuantity()){enough=false;break;} locked.put(item.getProduct().getId(),inv); } if(enough){ for(CartItem item:items){WarehouseInventory inv=locked.get(item.getProduct().getId());inv.setStockQty(inv.getStockQty()-item.getQuantity());inventory.save(inv);} return new Reservation(w,etaMinutes(w,address)); }}
        throw new IllegalArgumentException("No single dark store has all items in stock for this address");
    }
    @Data @AllArgsConstructor public static class Reservation { private Warehouse warehouse; private int etaMinutes; }
    public Warehouse get(Long id){return warehouses.findById(id).orElseThrow(()->new ResourceNotFoundException("Warehouse not found"));}
    public List<Warehouse> all(){return warehouses.findAll();}
    public boolean hasStock(Long productId, com.fastway.user.Address address){ if(address==null||address.getLatitude()==null||address.getLongitude()==null)return true; if(warehouses.findByIsActiveTrue().isEmpty()) return true; return warehouses.findByIsActiveTrue().stream().anyMatch(w->w.getLatitude()!=null&&w.getLongitude()!=null&&distanceKm(w.getLatitude(),w.getLongitude(),address.getLatitude(),address.getLongitude())<=w.getServiceRadiusKm()&&inventory.findByWarehouseIdAndProductId(w.getId(),productId).map(i->i.getStockQty()>0).orElse(false)); }
    public Warehouse save(Warehouse w){return warehouses.save(w);}
    public void deactivate(Long id){Warehouse w=get(id);w.setIsActive(false);warehouses.save(w);}
    public List<WarehouseInventory> stock(Long id){get(id);return inventory.findByWarehouseId(id);}
    public WarehouseInventory updateStock(Long wid,Long pid,Integer qty){ if(qty==null||qty<0)throw new IllegalArgumentException("Stock cannot be negative"); WarehouseInventory i=inventory.findByWarehouseIdAndProductId(wid,pid).orElseGet(()->WarehouseInventory.builder().warehouse(get(wid)).product(products.findById(pid).orElseThrow(()->new ResourceNotFoundException("Product not found"))).build()); i.setStockQty(qty); return inventory.save(i); }
    @Transactional public void release(List<OrderItem> items, Warehouse warehouse){ if(warehouse==null)return; for(OrderItem item:items){WarehouseInventory i=inventory.findForUpdate(warehouse.getId(),item.getProduct().getId()).orElseGet(()->WarehouseInventory.builder().warehouse(warehouse).product(item.getProduct()).stockQty(0).build()); i.setStockQty(i.getStockQty()+item.getQuantity()); inventory.save(i);} }
}
