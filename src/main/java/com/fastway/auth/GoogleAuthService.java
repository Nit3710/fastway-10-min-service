package com.fastway.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Service
public class GoogleAuthService {

    @Value("${google.client.id:dummy-client-id-for-dev}")
    private String googleClientId;

    public GoogleIdToken.Payload verifyToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            );

            if (googleClientId != null && !googleClientId.trim().isEmpty() && !googleClientId.equals("dummy-client-id-for-dev")) {
                builder.setAudience(Collections.singletonList(googleClientId));
            }

            GoogleIdTokenVerifier verifier = builder.build();
            GoogleIdToken idToken = verifier.verify(idTokenString);
            
            if (idToken != null) {
                return idToken.getPayload();
            } else {
                throw new IllegalArgumentException("Invalid Google ID token");
            }
        } catch (GeneralSecurityException | IOException e) {
            throw new IllegalArgumentException("Error verifying Google ID token: " + e.getMessage(), e);
        }
    }
}
