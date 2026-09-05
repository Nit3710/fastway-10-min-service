package com.fastway.delivery;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.ObjectProvider;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class FirebaseService {

    private final FirebaseDatabase firebaseDatabase;
    private final FirebaseAuth firebaseAuth;

    public FirebaseService(ObjectProvider<FirebaseDatabase> databaseProvider,
                           ObjectProvider<FirebaseAuth> authProvider) {
        this.firebaseDatabase = databaseProvider.getIfAvailable();
        this.firebaseAuth = authProvider.getIfAvailable();
    }

    public void updateOrderStatus(Long orderId, String status, Long customerUserId, Long deliveryPartnerUserId) {
        if (firebaseDatabase == null) {
            log.warn("Firebase Database is not configured. Skipping status sync.");
            return;
        }
        try {
            DatabaseReference ref = firebaseDatabase.getReference("orders/" + orderId);
            Map<String, Object> update = new HashMap<>();
            update.put("status", status);
            update.put("customerId", String.valueOf(customerUserId));
            if (deliveryPartnerUserId != null) {
                update.put("deliveryPartnerUserId", String.valueOf(deliveryPartnerUserId));
            }
            update.put("updatedAt", System.currentTimeMillis());
            ref.updateChildrenAsync(update);
            log.info("Successfully synced status change for order {} to Firebase.", orderId);
        } catch (Exception e) {
            log.error("Failed to sync order status to Firebase: {}", e.getMessage());
        }
    }

    public void updateDeliveryLocation(Long orderId, Double lat, Double lng) {
        if (firebaseDatabase == null) {
            log.warn("Firebase Database is not configured. Skipping location sync.");
            return;
        }
        try {
            DatabaseReference ref = firebaseDatabase.getReference("deliveryTracking/" + orderId + "/location");
            Map<String, Object> update = new HashMap<>();
            update.put("latitude", lat);
            update.put("longitude", lng);
            update.put("updatedAt", System.currentTimeMillis());
            ref.setValueAsync(update);
            log.info("Successfully synced location update for order {} to Firebase.", orderId);
        } catch (Exception e) {
            log.error("Failed to sync delivery location to Firebase: {}", e.getMessage());
        }
    }

    public String generateCustomToken(Long userId) {
        if (firebaseAuth == null) {
            throw new IllegalStateException("Firebase Authentication is not configured.");
        }
        try {
            return firebaseAuth.createCustomToken(String.valueOf(userId));
        } catch (Exception e) {
            log.error("Failed to generate Firebase custom token for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to generate Firebase custom token", e);
        }
    }
}
