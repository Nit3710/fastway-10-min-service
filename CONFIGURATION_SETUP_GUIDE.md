# Fastway Configuration Setup Guide

Yeh guide actual credentials/config values obtain karne aur local testing unblock karne ke liye hai.

## Current blockers

`src/main/resources/application.properties` me abhi placeholders hain:

```properties
razorpay.key.id=rzp_test_replace_me
razorpay.key.secret=replace_me
razorpay.webhook.secret=replace_me
firebase.enabled=false
firebase.storage.enabled=false
mail.enabled=false
google.client.id=dummy-client-id-for-dev
```

Database settings currently MySQL format me hain. Agar aap SQL Server use kar rahe hain, URL, driver aur Hibernate dialect tino change karne honge.

## 1. Database

### MySQL (current development configuration)

```sql
CREATE DATABASE fastway;
```

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/fastway?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
```

### SQL Server

SQL Server me `fastway` database create karke ye values set karein. SQL Server JDBC dependency bhi pom.xml me honi chahiye.

```properties
spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=fastway;encrypt=true;trustServerCertificate=true
spring.datasource.username=YOUR_SQLSERVER_USER
spring.datasource.password=YOUR_SQLSERVER_PASSWORD
spring.datasource.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.SQLServerDialect
```

MySQL driver/dialect aur SQL Server driver/dialect ko mix mat karein. Development me `spring.jpa.hibernate.ddl-auto=update` tables create/update karega.

## 2. JWT secret

JWT secret kisi dashboard se nahi milta; application owner khud random value generate karta hai. PowerShell:

```powershell
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Output paste karein:

```properties
jwt.secret=GENERATED_RANDOM_VALUE
jwt.access-expiration=900000
auth.refresh-expiration-days=30
```

Secret change karne par existing access tokens invalid ho jayenge.

## 3. Razorpay test credentials

1. Razorpay Dashboard me login karein.
2. **Test Mode** select karein.
3. Account/Settings ke API keys section me key generate karein.
4. `Key Id` (`rzp_test_...`) aur `Key Secret` copy karein.

```properties
razorpay.key.id=rzp_test_xxxxxxxxx
razorpay.key.secret=YOUR_RAZORPAY_TEST_SECRET
```

### Razorpay webhook

Webhook secret API secret se alag hota hai.

1. Local backend expose karein:

```powershell
ngrok http 8080
```

2. Razorpay Dashboard → Account & Settings → Webhooks → Add webhook.
3. URL set karein:

```text
https://YOUR-NGROK-ID.ngrok-free.app/api/payments/webhook
```

4. Dashboard me webhook secret khud set karein aur wahi value yahan paste karein:

```properties
razorpay.webhook.secret=YOUR_SEPARATE_WEBHOOK_SECRET
```

5. `payment.captured`, `payment.failed` aur `refund.processed` events enable karein. Test credentials hi use karein.

## 4. Firebase

Firebase Realtime Database/live tracking, push notifications aur Storage image uploads ke liye:

1. Firebase Console me project create/select karein.
2. Project Settings → Service Accounts → Generate new private key.
3. JSON file repository ke bahar rakhein, example `C:\secrets\fastway-firebase.json`.
4. Realtime Database create karke database URL copy karein.
5. Storage enable karke bucket name copy karein.
6. Properties set karein:

```properties
firebase.enabled=true
firebase.storage.enabled=true
firebase.credentials.path=C:/secrets/fastway-firebase.json
firebase.storage.bucket=YOUR_PROJECT_ID.appspot.com
firebase.database.url=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com
```

Mobile apps ke Firebase Android/iOS app configuration files bhi add karke native/dev build dobara banana pad sakta hai. Production me public database rules mat use karein.

## 5. SMTP email

Email testing optional hai. Gmail ke liye 2-Step Verification enable karke Security → App passwords se App Password generate karein. Normal Gmail password use na karein.

```properties
mail.enabled=true
mail.from=YOUR_GMAIL_ADDRESS
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_GMAIL_ADDRESS
spring.mail.password=YOUR_GMAIL_APP_PASSWORD
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

SMTP ready nahi hai to `mail.enabled=false` rakhein; order flow email ke bina test ho sakta hai.

## 6. Google login

Google login test karne ke liye Google Cloud Console → APIs & Services → OAuth consent screen configure karein, phir Credentials → OAuth Client ID create karein. Backend/client ke liye correct client id set karein:

```properties
google.client.id=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

Phone/password login test karna ho to dummy value reh sakti hai.

## 7. Admin CORS

Local admin panel:

```properties
app.cors.allowed-origins=http://localhost:5173
```

Production me exact domain set karein, `*` nahi:

```properties
app.cors.allowed-origins=https://admin.example.com
```

## 8. Mobile API URL

Mobile device par `localhost` phone hota hai, computer nahi:

- Android emulator: `http://10.0.2.2:8080`
- iOS simulator: `http://localhost:8080`
- Physical device: computer ka LAN IP, example `http://192.168.1.20:8080`

Phone aur computer same Wi-Fi par hon aur Windows Firewall me port 8080 allow ho.

## 9. Dark-store test data

1. Admin se active warehouse create karein with latitude/longitude/radius.
2. Warehouse inventory me product stock add karein.
3. Customer address me latitude/longitude save karein.
4. Cart me same warehouse ke available products add karein.
5. Order response me `warehouseId` aur `estimatedDeliveryMinutes` verify karein.

Coordinates missing hon to warehouse selection/ETA reliable nahi hoga; legacy product stock fallback use ho sakta hai.

## 10. Recommended testing order

1. `GET /api/health` and database startup.
2. Customer/admin phone-password login.
3. Admin category, brand, product create.
4. Customer address and pincode serviceability.
5. Cart and COD order.
6. Delivery partner status/location.
7. Firebase tracking/notifications.
8. Razorpay test payment.
9. Razorpay webhook.
10. SMTP email.

Integrations ko ek saath enable na karein. Pehle database + login + COD flow pass karein, phir Firebase, Razorpay aur SMTP ek-ek karke enable karein. Secrets source code me commit na karein.

## 11. Supabase Storage (Firebase Storage replacement)

Admin product image uploads now use Supabase Storage; the endpoint remains `POST /api/admin/upload-image`.

1. Supabase Dashboard me project create/open karein.
2. Project Settings → **API** se Project URL copy karein.
3. **Project API keys** me `service_role` key copy karein. Is key ko sirf backend me rakhein; mobile app, browser ya Git me expose na karein.
4. Storage → New bucket create karein named `fastway` (ya existing bucket ka exact naam yahi rakhein).
5. Product image URLs direct return karne ke liye bucket ko public karein, ya private bucket ke liye signed-URL implementation add karein.
6. Backend environment variables set karein:

```powershell
$env:SUPABASE_STORAGE_ENABLED="true"
$env:SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
$env:SUPABASE_STORAGE_BUCKET="fastway"
```

The backend uploads files under `images/products/` and returns the public URL. Restart the backend after setting these values. Firebase Realtime Database can remain enabled independently for live tracking; Firebase Storage is no longer required for product images.
