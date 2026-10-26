# QuickBite – Microservices-Based Food Delivery Platform with Centralized API Gateway

> **"Good food. Fast delivery."**

A full-stack, enterprise-grade food delivery web application built on a **Microservices Architecture** with a custom **Express.js Centralized API Gateway**, **React 19 + TypeScript + Tailwind CSS** frontend, and **MySQL 8.0** persistence.

---

## 🏛️ System Architecture

All client interactions flow **exclusively through the Centralized API Gateway on Port 4000**. Downstream microservices are decoupled and communicate with the Gateway via private loopback ports.

```
                                 [ BROWSER / CLIENT ]
                              React + Vite + TS (:5173)
                                          │
                        All Traffic Strictly Via Port 4000
                                          ▼
                      ╔════════════════════════════════════════╗
                      ║       CENTRALIZED API GATEWAY          ║
                      ║               Port :4000               ║
                      ║ ────────────────────────────────────── ║
                      ║  • Fixed-Window Rate Limiter (10/60s)  ║
                      ║  • Centralized JWT Verification        ║
                      ║  • Request ID Generation (UUIDv4)      ║
                      ║  • Real-Time Socket.IO Telemetry       ║
                      ║  • Reverse Proxy (http-proxy-mw)       ║
                      ╚════════════════════════════════════════╝
                                          │
            ┌───────────────────┬─────────┴─────────┬───────────────────┐
            │                   │                   │                   │
            ▼                   ▼                   ▼                   ▼
     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
     │ AUTH SERVICE│     │ USER SERVICE│     │ RESTAURANT  │     │ORDER SERVICE│
     │  Port :3001 │     │  Port :3002 │     │  Port :3003 │     │  Port :3004 │
     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
            │                   │                   │                   │
            └───────────────────┴─────────┬─────────┴───────────────────┘
                                          ▼
                               ┌─────────────────────┐
                               │    MySQL 8.0 DB     │
                               │   quickbite_db:3306 │
                               └─────────────────────┘
```

---

## 🔌 Port Registry

| Component | Port | Technology | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `4000` | Express, Socket.IO, `http-proxy-middleware` | Ingress traffic entry, Rate limiting (429), JWT validation, identity injection (`x-user-*`), latency logging, telemetry stream |
| **Auth Service** | `3001` | Express, TypeScript, bcrypt, JWT | User registration, password hashing (salt rounds 10), JWT token issuance |
| **User Service** | `3002` | Express, TypeScript, MySQL2 | Customer profile retrieval, delivery address CRUD, gateway identity context |
| **Restaurant Service** | `3003` | Express, TypeScript, MySQL2 | Restaurant catalog, search & filtering, menu item catalog, category management |
| **Order Service** | `3004` | Express, TypeScript, MySQL2 | Zero-trust backend price recalculation, order placement, lifecycle status transitions, order history |
| **Web Frontend** | `5173` | React 19, Vite 8, TypeScript, Tailwind CSS, Recharts | Interactive consumer storefront, 1-click demo logins, cart & checkout, order tracking, admin console, live gateway monitor |
| **MySQL Server** | `3306` | MySQL Server 8.0 (Windows Service `MySQL80`) | Relational persistence (`quickbite_db`), foreign keys with referential integrity, indexes |

---

## 🚀 Key Academic Architectural Patterns

### 1. Centralized Ingress API Gateway Pattern
- The frontend client is **strictly prohibited** from communicating directly with microservices on ports `3001`, `3002`, `3003`, or `3004`.
- All requests target `http://localhost:4000/api/*`. The Gateway dynamically routes each request to its target service:
  - `/api/auth/*` → Auth Service (`:3001`)
  - `/api/users/*` → User Service (`:3002`)
  - `/api/restaurants/*` → Restaurant Service (`:3003`)
  - `/api/orders/*` → Order Service (`:3004`)
- Incoming JSON request bodies parsed by Express are automatically re-streamed to downstream services via `fixRequestBody(proxyReq, req)` to avoid stream exhaustion bugs.

### 2. Centralized Authentication & Identity Forwarding
- Downstream microservices (User, Restaurant, Order) do **not** re-parse or re-verify JWT credentials individually.
- The Gateway intercepts protected requests, validates the signature and expiry of the Bearer token using `JWT_SECRET`, extracts the payload, and forwards identity headers:
  - `x-user-id: <id>`
  - `x-user-email: <email>`
  - `x-user-role: <role>`
- Downstream microservices trust these headers as the authenticated identity context.

### 3. Fixed-Window Rate Limiting (429 Enforcement)
- Pure mathematical fixed-window rate limiter implemented directly in Node.js without external dependencies:
  $$\text{Window} = \lfloor \text{Current Timestamp} / 60000 \rfloor$$
- Limit: **10 requests per 60-second window per client IP**.
- Returns `HTTP 429 Too Many Requests` with `Retry-After: <seconds>` when exceeded.

### 4. Zero-Trust Backend Pricing Engine
- When placing orders (`POST /api/orders`), the client sends **only** `menu_item_id` and `quantity`.
- The Order Service rejects any client-supplied item prices or subtotal sums:
  $$\text{subtotal}_i = \text{price}_{\text{db}, i} \times \text{quantity}_i$$
  $$\text{total} = \sum_{i} \text{subtotal}_i$$
- Live MySQL item prices are queried inside an ACID transaction to guarantee absolute financial integrity.

### 5. Real-Time Telemetry & Socket.IO Topology Stream
- The Gateway tracks telemetry metrics in an in-memory ring buffer (total requests, current requests/sec, error counts, rate-limited counts, rolling average latency).
- Broadcasts real-time events (`metrics:snapshot` every 1s, and `gateway:request` on each incoming request) over Socket.IO to `/gateway-monitor`.
- The Live Gateway Monitor renders interactive Recharts graphs and a visual microservice topology mesh with **real animated request pulses** as traffic arrives.

---

## 👤 QuickBite Demo Accounts

All seeded demo accounts share the standard development password:
`QuickBite@123`

| Role | Email | Password | Name | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@quickbite.demo` | `QuickBite@123` | Aarav Sharma | Platform administration, order status dispatch, restaurant availability toggles |
| **RESTAURANT_OWNER** | `owner01@quickbite.demo` | `QuickBite@123` | Vikram Reddy | Restaurant partner (Deccan Spice House) |
| **RESTAURANT_OWNER** | `owner02@quickbite.demo` | `QuickBite@123` | Priya Nair | Restaurant partner (Garden City Dosa) |
| **RESTAURANT_OWNER** | `owner03@quickbite.demo` | `QuickBite@123` | Rohan Mukherjee | Restaurant partner (Mumbai Street Kitchen) |
| **RESTAURANT_OWNER** | `owner04@quickbite.demo` | `QuickBite@123` | Ananya Iyer | Restaurant partner (Capital Tandoor) |
| **CUSTOMER** | `customer01@quickbite.demo` | `QuickBite@123` | Kavya Patel | Customer ordering, browsing restaurants, order tracking |
| **CUSTOMER** | `customer02@quickbite.demo` | `QuickBite@123` | Siddharth Rao | Customer ordering, browsing restaurants, order tracking |
| **CUSTOMER** | `customer03@quickbite.demo` | `QuickBite@123` | Sneha Kulkarni | Customer ordering, browsing restaurants, order tracking |

*(1-click login buttons for Customer, Admin, and Restaurant Owner are available directly on `/login`)*

---

## 🛠️ Quick Start & Running the Project

### Prerequisites
1. **Node.js** (v18.0.0 or higher) & **npm**
2. **MySQL Server 8.0** running on `localhost:3306` (Windows service `MySQL80`)

### 1. Database Initialization
```powershell
# From project root:
npm run db:setup     # Creates quickbite_db and 6 relational tables with InnoDB constraints
npm run db:seed      # Seeds 22 users, 34 addresses, 16 restaurants, 176 menu items, 35 orders
```

### 2. Start Full Stack Application
```powershell
# Starts Gateway (:4000), Auth (:3001), User (:3002), Restaurant (:3003), Order (:3004), and Frontend (:5173) concurrently:
npm run dev
```

Alternatively, to run backend microservices independently:
```powershell
npm run dev:backend  # Starts Gateway + all 4 microservices
npm run dev:frontend # Starts React frontend only
```

Access the frontend application at: **`http://localhost:5173`**  
Access the Live Gateway Monitor at: **`http://localhost:5173/gateway-monitor`**  
Access the Admin Dashboard at: **`http://localhost:5173/admin`**

---

## 🧪 Testing & Validation Suite

### 1. Controlled Concurrency Load Tester
```powershell
npm run test:load
```
Fires 30 controlled concurrent requests across 5 worker threads directly at `http://localhost:4000/api/restaurants`. Outputs throughput (RPS), min/avg/p95 latency metrics, and status code distributions.

### 2. Centralized JWT Authentication Verification
```powershell
npm run test:jwt
```
Validates:
- Protected routes reject unauthenticated requests with `401 Unauthorized`.
- Protected routes reject tampered/forged JWT signatures with `401 Unauthorized`.
- Authentic login via Gateway issues valid token.
- Protected route verifies token and forwards user identity headers to downstream services.

### 3. Fixed-Window Rate Limiter Burst Test
```powershell
npm run test:rate-limit
```
Fires a burst of 15 rapid consecutive requests from a single client. Confirms requests 1–10 receive `200 OK` and requests 11–15 are blocked with `HTTP 429 Too Many Requests` and `Retry-After`.

### 4. Build Verification
```powershell
npm run build:all
```
Compiles TypeScript across all 6 sub-packages (Gateway, Auth, User, Restaurant, Order, Frontend).

---

## 📋 Development Phases Status

- [x] **PHASE 1**: Project structure creation and package initialization.
- [x] **PHASE 2**: Configure local MySQL and create schema (`database/schema.sql`).
- [x] **PHASE 3**: Insert synthetic seed data (`database/seed.sql`).
- [x] **PHASE 4**: Build Auth Service (`:3001`).
- [x] **PHASE 5**: Build User Service (`:3002`).  
- [x] **PHASE 6**: Build Restaurant Service (`:3003`).
- [x] **PHASE 7**: Build Order Service (`:3004`).
- [x] **PHASE 8**: Build API Gateway (`:4000`).
- [x] **PHASE 9**: Implement routing logic.
- [x] **PHASE 10**: Implement centralized JWT validation.
- [x] **PHASE 11**: Implement fixed-window rate limiting.
- [x] **PHASE 12**: Implement request logging and Request IDs.
- [x] **PHASE 13**: Implement service health checks.
- [x] **PHASE 14**: Implement Socket.IO live gateway monitoring.
- [x] **PHASE 15**: Build QuickBite React frontend foundation and design system.
- [x] **PHASE 16**: Build authentication UI with 1-click demo accounts.
- [x] **PHASE 17**: Build restaurant catalog, search, and category filters.
- [x] **PHASE 18**: Build cart and checkout flow with zero-trust billing.
- [x] **PHASE 19**: Build real-time order tracking with status simulator.
- [x] **PHASE 20**: Build admin dashboard with live order stage dispatch.
- [x] **PHASE 21**: Build Live Gateway Monitor UI with live telemetry.
- [x] **PHASE 22**: Build controlled load tester and validation suite.
- [x] **PHASE 23**: End-to-end integration and port routing verification.
- [x] **PHASE 24**: Comprehensive multi-service testing.
- [x] **PHASE 25**: Bug fixes, TypeScript strict mode, and bundle optimization.
- [x] **PHASE 26**: Complete documentation and project defense script.

---

## 🎥 Demonstration Walkthrough for Evaluators

1. **Open Storefront**: Navigate to `http://localhost:5173`. Browse restaurants across Indian cities, test cuisine filters (Biryani, North Indian, Pizza, etc.), and search.
2. **Open Live Gateway Monitor**: In a separate browser tab, open `http://localhost:5173/gateway-monitor`. Observe the live topology mesh and real-time request counters.
3. **1-Click Authentication**: Go to `/login` and click **"Customer"** to instantly sign in as Kavya Patel.
4. **Order Flow & Zero-Trust Pricing**:
   - Open a restaurant (e.g. *Deccan Spice House*).
   - Add items to the cart using the interactive `[- 1 +]` counter.
   - Go to `/cart`, choose a saved delivery address (or add a new one inline).
   - Click **Place Order**. Note the zero-trust calculation: the backend verifies database prices and creates the order.
5. **Real-Time Tracking & Demo Simulator**:
   - On the order tracking page (`/orders/:id`), view the visual delivery timeline.
   - Click **"Advance Status (Demo)"** to progress the order from `PLACED` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED`.
6. **Live Telemetry & Rate Limiting Defense**:
   - Switch back to `/gateway-monitor` to see all your browsing, auth, and order requests captured with latency and status codes.
   - Run `npm run test:rate-limit` in the terminal to demonstrate the fixed-window rate limiter blocking excessive bursts with HTTP 429.
   - Run `npm run test:jwt` to demonstrate security enforcement on forged vs valid JWT tokens.
