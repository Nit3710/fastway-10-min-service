# Fastway Hardware & Sanitary Commerce Platform

This document describes the current customer, delivery-partner, admin and backend flows, plus the configuration required to run and test the system locally.

## 1. System overview

Fastway consists of:

| Application | Purpose | Local entry |
|---|---|---|
| Spring Boot API | Auth, catalog, cart, addresses, orders, payments, notifications, warehouses and delivery assignment | `http://localhost:8080` |
| Customer app | Browse products, manage cart/addresses, place COD or Razorpay orders, track status and notifications | `customer-app` |
| Delivery partner app | View assigned jobs, update delivery status and share live location | `delivery-app` |
| Admin panel | Dashboard, catalog, users, orders, payments, notifications, serviceable pincodes and warehouse inventory | `http://localhost:5173` |

The API uses JWT access tokens and server-side refresh tokens. Protected calls send `Authorization: Bearer <access_token>`.

## 2. Customer journey

1. Sign up or log in with phone/password. The API returns an access token and refresh token.
2. Add or select an address. The address should contain latitude and longitude when dark-store fulfilment is enabled.
3. Browse categories/products. Product listing can receive `address_id`; when supplied, stock is evaluated against warehouses serving that address.
4. Add products to cart. Cart operations validate product availability.
5. Checkout validates address, cart and stock.
6. The order service selects the nearest active warehouse that is inside its service radius and can fulfil the complete cart. Existing installations without warehouse data fall back to the legacy product stock field.
7. Stock is locked and decremented atomically. The order stores the fulfilling warehouse and an approximate ETA.
8. COD orders are immediately eligible for automatic delivery-partner assignment.
9. Online orders start with `PENDING` payment. The app creates a Razorpay order, opens Razorpay checkout, and calls verification. The server verifies the signature. Razorpay webhooks remain the final backstop.
10. After payment confirmation, the order becomes `CONFIRMED` and automatic delivery assignment runs.
11. The customer sees order status, payment/refund status, ETA countdown and Firebase live location when the delivery is out for delivery.
12. Cancelling a paid online order restores warehouse stock and starts a full Razorpay refund. Payment states are `PAID -> REFUND_INITIATED -> REFUNDED`; API failures are visible as `REFUND_FAILED`.

### Customer API surface

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/addresses`
- `PUT /api/addresses/{id}/default`
- `GET /api/addresses/check-serviceability?pincode=...`
- `GET /api/categories`
- `GET /api/brands`
- `GET /api/products`
- `GET /api/products/{id}`
- `GET/POST/PUT/DELETE /api/cart`
- `POST /api/orders` (send `Idempotency-Key: <uuid>`)
- `GET /api/orders`, `GET /api/orders/{id}`
- `PUT /api/orders/{id}/cancel`
- `POST /api/payments/create-order`
- `POST /api/payments/verify`
- `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/{id}/read`

## 3. Payment flow

COD does not call Razorpay. The order is placed with `payment_status=PENDING` and can be assigned for delivery.

For online payment:

1. Create the order with `payment_mode=ONLINE`.
2. Call `/api/payments/create-order` with the returned order id.
3. Open Razorpay using the returned key id, amount and Razorpay order id.
4. Send Razorpay callback values to `/api/payments/verify`.
5. The server verifies the signature using the API secret. Never mark an order paid in the client.
6. Razorpay sends `payment.captured`, `payment.failed` and refund events to `/api/payments/webhook`.

The webhook path is excluded from normal JWT authentication but is protected by the Razorpay webhook HMAC secret.

## 4. Delivery partner journey

1. A delivery-partner account logs in and receives the same access/refresh token pair.
2. The app calls `GET /api/delivery/assignments` to load assigned orders.
3. The partner opens an assignment and updates status through:
   - `PUT /api/delivery/assignments/{id}/status`
   - Typical states: `ASSIGNED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`.
4. While active, the app sends current coordinates to `PUT /api/delivery/location`.
5. The customer app receives status/location updates through Firebase Realtime Database where Firebase is configured.

### Automatic assignment

The backend chooses an active, available partner without an active assignment, nearest to the fulfilling warehouse. If none is available, the order remains unassigned and a scheduled retry runs every 30 seconds by default. Admin assignment remains available as an override:

`POST /api/admin/orders/{id}/assign-delivery`

## 5. Admin panel journey

1. Admin signs in at `http://localhost:5173/login`.
2. The panel stores the access token and refresh token. Its Axios interceptor silently refreshes on a 401 and retries once.
3. Admin can use:
   - Dashboard: users, orders, revenue, delivery partners and recent orders.
   - Products: create/edit/deactivate products and upload product images.
   - Categories and brands: manage catalog taxonomy.
   - Orders: inspect orders, update lifecycle status and manually assign delivery partners.
   - Payments: inspect payment records and refund states.
   - Notifications: view and mark admin notifications as read.
   - Delivery Zones: manage serviceable pincodes, delivery charges and bulk CSV upload.
   - Warehouses: manage dark stores and warehouse inventory through the warehouse APIs.
4. Logout calls the backend revoke endpoint before clearing local storage.

### Admin API surface

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/payments`
- `GET /api/admin/delivery-partners`
- `GET/PUT /api/admin/orders`
- `PUT /api/admin/orders/{id}/status`
- `POST /api/admin/orders/{id}/assign-delivery`
- `POST /api/admin/upload-image`
- `GET/POST/PUT/DELETE /api/admin/serviceable-pincodes`
- `POST /api/admin/serviceable-pincodes/bulk-upload`
- `GET/POST/PUT/DELETE /api/admin/warehouses`
- `GET /api/admin/warehouses/{id}/inventory`
- `PUT /api/admin/warehouses/{id}/inventory/{productId}`
- `POST /api/admin/warehouses/{id}/inventory/bulk`

## 6. Dark-store configuration and operational rules

Create at least one active warehouse with latitude, longitude and service radius. Then populate `WarehouseInventory` for every product that should be sellable from that warehouse. New orders use warehouse inventory when a customer address has coordinates.

Example warehouse:

```json
{
  "name": "Central Delhi Dark Store",
  "address": "Example Market, Delhi",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "isActive": true,
  "serviceRadiusKm": 5
}
```

Example stock update:

```json
{ "productId": 12, "stockQty": 40 }
```

Inventory uses row locking during reservation. Splitting one order across multiple warehouses is intentionally not supported yet; the complete cart must be fulfilable by one warehouse.

## 7. Local configuration

### Backend prerequisites

- Java 17+
- Maven 3.9+
- A running relational database
- Node.js for the admin panel
- Android Studio/Android SDK or Xcode for the mobile apps

The checked-in `application.properties` currently uses MySQL settings (`jdbc:mysql://localhost:3306/fastway`). If your deployment uses SQL Server, replace the JDBC URL, driver, username/password and Hibernate dialect together; do not mix a SQL Server URL with the MySQL driver/dialect.

Minimum local database setup for the checked-in configuration:

```sql
CREATE DATABASE fastway;
```

`spring.jpa.hibernate.ddl-auto=update` creates/updates tables for development. Use migrations and backups before production.

### Backend properties/environment variables

```properties
server.port=8080
app.cors.allowed-origins=http://localhost:5173

spring.datasource.url=jdbc:mysql://localhost:3306/fastway?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=root

jwt.secret=<long-random-secret>
jwt.access-expiration=900000
auth.refresh-expiration-days=30

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=<test-api-secret>
RAZORPAY_WEBHOOK_SECRET=<dashboard-webhook-secret>

FIREBASE_ENABLED=false
FIREBASE_STORAGE_ENABLED=false
FIREBASE_CREDENTIALS_PATH=<service-account-json-path>
FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
FIREBASE_DATABASE_URL=<firebase-realtime-database-url>

MAIL_ENABLED=false
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<smtp-user>
MAIL_PASSWORD=<smtp-app-password>
MAIL_FROM=<sender-address>
```

Use environment variables or deployment secrets for real credentials. Do not commit Razorpay, Firebase, JWT or SMTP secrets.

### Firebase setup

1. Create/select a Firebase project.
2. Enable Realtime Database for delivery tracking and notifications.
3. Enable Storage if admin image uploads are required.
4. Create a service account and download its JSON outside the repository.
5. Set `FIREBASE_CREDENTIALS_PATH`, bucket and database URL.
6. Configure Android/iOS Firebase app files in each mobile app as required by Expo/React Native.

### Razorpay setup

1. Create Razorpay test-mode credentials.
2. Set the key id and API secret.
3. Configure webhook URL as `https://<public-host>/api/payments/webhook`.
4. For local testing, expose port 8080 through ngrok and use its HTTPS URL.
5. Set the separate webhook secret in `RAZORPAY_WEBHOOK_SECRET`.
6. Enable payment captured, payment failed and refund processed events.

### SMTP setup

SMTP is optional. For Gmail, use an App Password, not the normal account password. Set `MAIL_ENABLED=true` only after the SMTP values are valid.

## 8. Start commands

Backend from the repository root:

```powershell
mvn spring-boot:run
```

Admin panel:

```powershell
cd admin-panel
npm install
npm run dev
```

Customer app:

```powershell
cd customer-app
npm install
npx expo start
```

Delivery app:

```powershell
cd delivery-app
npm install
npx expo start
```

For a physical phone, `localhost` points to the phone. Use the computer's LAN IP in each mobile app's API client instead, and allow port 8080 through the firewall.

## 9. End-to-end test checklist

### Health and authentication

1. `GET http://localhost:8080/api/health` returns success.
2. Sign up a customer and log in.
3. Log in an admin and confirm `role=ADMIN`.
4. Refresh with the refresh token and confirm a new access token is returned.
5. Logout and confirm the refresh token cannot be reused.

### Catalog and cart

1. Create a category, brand and product from the admin panel.
2. Upload an image if Firebase Storage is enabled.
3. Browse products from the customer app.
4. Add/remove cart items and verify totals.

### Delivery zones

1. Add a six-digit serviceable pincode.
2. Search and paginate in Delivery Zones.
3. Toggle active/inactive and verify `/api/addresses/check-serviceability`.
4. Upload a CSV containing valid and invalid rows and verify the failure summary.

### Dark-store stock and ETA

1. Create an active warehouse with coordinates and radius.
2. Add inventory for all products in a test cart.
3. Add a customer address with coordinates inside the radius.
4. Place an order and verify `warehouseId` and `estimatedDeliveryMinutes`.
5. Place two concurrent orders for the last unit and verify only one succeeds.
6. Cancel the order and verify warehouse stock is restored.

### COD delivery flow

1. Place a COD order.
2. Verify it is automatically assigned when an available partner exists.
3. Open the delivery app and move through assignment statuses.
4. Send location updates and verify the customer tracking screen.
5. Disable all partners and verify the order remains unassigned, then re-enable one and wait for scheduled retry.

### Razorpay/refund flow

1. Create an online order.
2. Use Razorpay test card/UPI details.
3. Verify the client callback and server signature verification.
4. Confirm webhook delivery is accepted with a valid signature and rejected with an invalid one.
5. Cancel the paid order and verify `REFUND_INITIATED`.
6. Send/receive `refund.processed` and verify `REFUNDED`.
7. Simulate a Razorpay API failure and verify cancellation succeeds while payment status becomes `REFUND_FAILED`.

## 10. Common issues

- **403 from admin APIs:** login as a user whose database role is `ADMIN`; clear stale browser tokens and sign in again.
- **Mobile cannot reach API:** replace `localhost` with the host machine LAN IP.
- **Products show zero stock:** pass a valid address with coordinates and populate warehouse inventory.
- **No automatic delivery assignment:** partner must be active, available, have coordinates and no active assignment.
- **Webhook not received:** use an HTTPS public URL, verify the dashboard secret and check backend logs without logging secrets.
- **Firebase tracking absent:** confirm Firebase credentials, database URL and mobile Firebase configuration files.
- **SQL Server connection failure:** update URL, driver dependency and Hibernate dialect consistently; the checked-in development properties are MySQL-oriented.

## 11. Production hardening still recommended

- Replace `ddl-auto=update` with Flyway/Liquibase migrations.
- Add database indexes for order status, warehouse/product inventory and assignment status.
- Add an outbox/queue for notifications and assignment events.
- Add a unique idempotency constraint on `(user_id, key)` at database level.
- Add audit logs for admin stock changes and refunds.
- Use a distributed scheduler/lock when running more than one backend instance.
- Use traffic-aware routing and live courier ETA instead of the current straight-line approximation.
