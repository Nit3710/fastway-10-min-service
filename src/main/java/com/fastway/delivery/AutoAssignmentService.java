package com.fastway.delivery;

import com.fastway.order.*;
import com.fastway.warehouse.Warehouse;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j
public class AutoAssignmentService {
 private final OrderRepository orders; private final DeliveryPartnerRepository partners; private final DeliveryAssignmentRepository assignments; private final DeliveryService deliveryService;
 @Transactional public boolean tryAssign(Long orderId){ Order o=orders.findById(orderId).orElse(null); if(o==null||o.getFulfillingWarehouse()==null||assignments.findByOrderId(orderId).isPresent())return false; if(o.getPaymentMode()==PaymentMode.ONLINE&&o.getPaymentStatus()!=PaymentStatus.PAID)return false; Warehouse w=o.getFulfillingWarehouse(); List<DeliveryPartner> candidates=partners.findAll().stream().filter(p->Boolean.TRUE.equals(p.getIsActive())&&Boolean.TRUE.equals(p.getIsAvailable())&&p.getCurrentLat()!=null&&p.getCurrentLng()!=null&&!assignments.existsByDeliveryPartnerUserIdAndStatusNotIn(p.getUser().getId(),List.of(DeliveryAssignmentStatus.DELIVERED,DeliveryAssignmentStatus.CANCELLED))).sorted(Comparator.comparingDouble(p->distance(w.getLatitude(),w.getLongitude(),p.getCurrentLat(),p.getCurrentLng()))).toList(); if(candidates.isEmpty())return false; deliveryService.assignDelivery(orderId,candidates.get(0).getId()); return true; }
 @Scheduled(fixedDelayString="${delivery.auto-assignment-delay-ms:30000}") @Transactional public void retryUnassigned(){orders.findByStatus(OrderStatus.PLACED,org.springframework.data.domain.PageRequest.of(0,100)).forEach(o->{tryAssign(o.getId());});}
 private double distance(double a,double b,double c,double d){double p=Math.PI/180,x=(c-a)*p,y=(d-b)*p,h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*p)*Math.cos(c*p)*Math.sin(y/2)*Math.sin(y/2);return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
}
