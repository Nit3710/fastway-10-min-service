package com.fastway.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.FirebaseDatabase;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import java.io.FileInputStream;
import java.io.IOException;

@Configuration
@Slf4j
@ConditionalOnProperty(name = "firebase.enabled", havingValue = "true")
public class FirebaseConfig {

    @Value("${firebase.credentials.path:}")
    private String credentialsPath;

    @Value("${firebase.database.url:}")
    private String databaseUrl;

    @Value("${firebase.storage.bucket:}")
    private String storageBucket;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (credentialsPath == null || credentialsPath.isBlank()) {
            log.warn("Firebase credentials path is empty. Firebase features will be disabled.");
            return null;
        }

        if (FirebaseApp.getApps().isEmpty()) {
            GoogleCredentials credentials;
            try (FileInputStream input = new FileInputStream(credentialsPath)) {
                credentials = GoogleCredentials.fromStream(input);
            }

            FirebaseOptions.Builder builder = FirebaseOptions.builder()
                    .setCredentials(credentials);

            if (databaseUrl != null && !databaseUrl.isBlank()) {
                builder.setDatabaseUrl(databaseUrl);
            }
            if (storageBucket != null && !storageBucket.isBlank()) {
                builder.setStorageBucket(storageBucket);
            }

            FirebaseApp app = FirebaseApp.initializeApp(builder.build());
            log.info("Firebase Application initialized successfully.");
            return app;
        } else {
            return FirebaseApp.getInstance();
        }
    }

    @Bean
    public FirebaseDatabase firebaseDatabase(FirebaseApp firebaseApp) {
        if (firebaseApp == null || databaseUrl == null || databaseUrl.isBlank()) {
            return null;
        }
        return FirebaseDatabase.getInstance(firebaseApp);
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        if (firebaseApp == null) {
            return null;
        }
        return FirebaseAuth.getInstance(firebaseApp);
    }

    @Bean
    public Storage firebaseStorage() throws IOException {
        if (credentialsPath == null || credentialsPath.isBlank()) {
            return null;
        }
        GoogleCredentials credentials;
        try (FileInputStream input = new FileInputStream(credentialsPath)) {
            credentials = GoogleCredentials.fromStream(input);
        }
        return StorageOptions.newBuilder().setCredentials(credentials).build().getService();
    }
}
