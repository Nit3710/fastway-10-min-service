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

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${firebase.credentials.json:}")
    private String credentialsJson;

    @Value("${firebase.credentials.path:}")
    private String credentialsPath;

    @Value("${firebase.database.url:}")
    private String databaseUrl;

    @Value("${firebase.storage.bucket:}")
    private String storageBucket;

    private GoogleCredentials getGoogleCredentials() throws IOException {
        if (credentialsJson != null && !credentialsJson.isBlank()) {
            log.info("Loading Firebase credentials from FIREBASE_CREDENTIALS_JSON environment variable.");
            try (InputStream is = new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8))) {
                return GoogleCredentials.fromStream(is);
            }
        }
        if (credentialsPath != null && !credentialsPath.isBlank()) {
            log.info("Loading Firebase credentials from file path: {}", credentialsPath);
            try (InputStream is = new FileInputStream(credentialsPath)) {
                return GoogleCredentials.fromStream(is);
            }
        }
        return null;
    }

    @Bean
    public FirebaseApp firebaseApp() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        try {
            GoogleCredentials credentials = getGoogleCredentials();
            if (credentials == null) {
                log.warn("Firebase credentials (JSON string or file path) not provided. Push notifications & Firebase will be disabled.");
                return null;
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
            log.info("Firebase Application initialized successfully for FCM push notifications.");
            return app;
        } catch (Exception ex) {
            log.error("Failed to initialize Firebase App: {}", ex.getMessage(), ex);
            return null;
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
        GoogleCredentials credentials = getGoogleCredentials();
        if (credentials == null) {
            return null;
        }
        return StorageOptions.newBuilder().setCredentials(credentials).build().getService();
    }
}
