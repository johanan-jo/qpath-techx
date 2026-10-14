# QPath: Intelligent Fleet Dispatch & Quantum-Inspired Route Optimization Platform

QPath is an enterprise-grade transportation operations and intelligent fleet dispatch platform. It is engineered to solve the NP-hard **Capacitated Vehicle Routing Problem (CVRP)** under dynamic traffic conditions by running **Quantum-Inspired Particle Swarm Optimization (QPSO)** algorithms on classical computing hardware.

The platform provides a unified operations ecosystem connecting **fleet dispatch controllers**, **field delivery drivers**, and **end customers** through dedicated, role-isolated interfaces backed by real-time telemetry, geographic information systems (GIS), and a cryptographic delivery verification handshake.

---

## 📌 Problem Statement

Urban logistics and last-mile distribution networks face escalating operational complexities:

1. **High Combinatorial Complexity (NP-Hardness)**: As the number of delivery waypoints, vehicle capacity constraints, and operational variables grow, standard exact algorithms become computationally intractable.
2. **Local Minima Trapping in Classical Heuristics**: Traditional heuristic algorithms (e.g., standard Greedy Nearest-Neighbor, Dijkstra, and classical PSO) easily get trapped in sub-optimal local minima, especially in dense metropolitan networks with non-linear congestion corridors.
3. **Multi-Objective Trade-Off Conflicts**: Logistics teams struggle to simultaneously minimize transit time, route distance, congestion exposure, and vehicular operational costs (fuel and maintenance) using one-dimensional routing systems.
4. **Operational Silos & Delivery Disputes**: Lack of synchronization between dispatchers, drivers, and customers results in route deviation, failed delivery attempts, and disputes regarding delivery completion.

QPath resolves these challenges by combining a multi-objective cost evaluation function, quantum-tunneling search heuristics on standard classical CPUs, real-time traffic shock simulation, and synchronized three-tier dashboards.

---

## ⚙️ Core Architecture & Optimization Engine

### 1. Multi-Objective Evaluation Function

QPath evaluates route fitness using a weighted, normalized multi-objective function:

$$F(R) = w_1 \cdot T(R) + w_2 \cdot D(R) + w_3 \cdot C(R) + w_4 \cdot O(R)$$

- **$T(R)$ — Total Travel Time**: Cumulative transit duration across all vehicle routes, factoring in link-level traffic impedance.
- **$D(R)$ — Total Route Distance**: Cumulative geographic distance (km) traversed by the fleet.
- **$C(R)$ — Congestion Penalty**: Time-varying congestion exposure along specific arterial road segments.
- **$O(R)$ — Operational Cost**: Direct cost calculation based on vehicle fuel consumption, idling penalties, and wear (₹).
- **$w_1, w_2, w_3, w_4$ — Configurable Weights**: Operators can adjust weights dynamically to prioritize speed, fuel conservation, or congestion avoidance based on operational priorities.

### 2. Quantum Particle Swarm Optimization (QPSO)

Unlike classical PSO—which relies on Newtonian position and velocity updates and is prone to premature convergence—QPSO models particles within a quantum potential well:

- **Wave Function & Delta Potential Well**: Particles possess a quantum state and can appear anywhere in the multidimensional search space according to a probability distribution, enabling **quantum tunneling** to escape local minima.
- **Local Attractor Position ($p$)**:
  $$p_{i,j} = \phi \cdot p_{best, i, j} + (1 - \phi) \cdot g_{best, j}, \quad \phi \sim U(0, 1)$$
- **Mean Best Position ($m_{best}$)**: The centroid of all individual best positions across the active swarm:
  $$m_{best} = \frac{1}{M} \sum_{i=1}^{M} p_{best, i}$$
- **Position Update via Quantum Inversion**:
  $$x_{i,j}(t+1) = p_{i,j}(t) \pm \beta \cdot |m_{best, j}(t) - x_{i,j}(t)| \cdot \ln\left(\frac{1}{u}\right), \quad u \sim U(0, 1)$$
- **Contraction-Expansion Coefficient ($\beta$)**: Dynamically annealed over iterations to balance broad global exploration in early phases with fine local exploitation in later stages.
- **Zero Quantum Hardware Requirement**: Executes deterministically and efficiently on standard classical servers and multi-core processors.

### 3. Multi-Algorithm Benchmarking Suite

QPath features a side-by-side comparative benchmarking engine that tests the same route payload against industry baselines:
- **QPSO**: Quantum-inspired tunneling PSO.
- **Classical PSO**: Standard velocity-inertia model.
- **Genetic Algorithm (GA)**: Order-crossover (OX), tournament selection, and mutation.
- **Greedy Dijkstra**: Multi-vehicle nearest-neighbor baseline.
- **Google OR-Tools CVRP**: Constrained integer programming solver.

---

## 🖥️ Operational Dashboards & Capabilities

QPath provides three purpose-built interfaces tailored to each stakeholder in the logistics lifecycle:

```
┌─────────────────────────────────────────────────────────────────┐
│                    QPath Central Ecosystem                      │
└────────────────┬────────────────┬────────────────┬──────────────┘
                 │                │                │
                 ▼                ▼                ▼
┌─────────────────────────┐ ┌───────────┐ ┌──────────────────────┐
│  Fleet Admin Console    │ │  Driver   │ │ End-Customer Portal  │
│  (Dispatch & Analytics) │ │  Cockpit  │ │ (Consignment Status) │
└─────────────────────────┘ └───────────┘ └──────────────────────┘
```

---

### 1. Fleet Operations Console (Admin Portal)

Designed for centralized control rooms, dispatchers, and operations managers.

- **Map-First Workspace**: A high-density interactive Leaflet / OpenStreetMap canvas (occupying ~75% of the viewport) displaying:
  - Color-coded vehicle routes with route highlighting on selection and dimming of unselected routes.
  - Numbered stop markers with payload demand callouts and a distinct central depot origin marker.
  - Optional traffic condition overlay with dashed lines to clearly distinguish road congestion from vehicle routes.
  - Live GPS tracking indicator for active field drivers.
- **Three-Phase Operations Workflow Panel**:
  - **Plan**:
    - Configure fleet parameters: active vehicle count, payload capacity limits, swarm particle count, and maximum iterations.
    - Set objective weights ($w_1, w_2, w_3, w_4$) with real-time balance validation.
    - Destination stop management via OpenStreetMap Nominatim address search, direct map click-to-add, or manual latitude/longitude input.
  - **Dispatch**:
    - Monitor real-time fleet telemetry: active driver units, assigned delivery jobs, and available batches.
    - OTP verification ledger: inspect customer verification tokens, driver delivery receipts, and verification timestamps.
    - Admin Return-to-Hub verification: inspect and check-in undelivered or returned parcels from drivers.
  - **Analyze**:
    - Empirical before-and-after benchmark comparison showing real percentage improvements in transit time, distance, and fleet operational costs over the greedy baseline.
    - Interactive per-vehicle telemetry table (stops count, travel duration, distance, fuel cost, capacity utilization) with click-to-highlight routing.
- **Traffic Corridor Shock Simulation**:
  - Inject localized congestion or emergency closures between specific corridor stops.
  - Test and verify real-time dynamic swarm re-optimization under adverse conditions.

---

### 2. Driver Cockpit (`DriverDashboard`)

A streamlined, mobile-responsive interface designed for delivery drivers on the road.

- **Available Dispatch Jobs Pool**:
  - Drivers can view unassigned delivery batches, review stop count, payload demands, estimated distance, and transit time.
  - One-click job acceptance that automatically triggers localized route optimization originating from the driver’s current GPS coordinates.
- **Active Turn-by-Turn Delivery Cockpit**:
  - Real-time KPI banner: active job ID, stops completed vs. remaining, and estimated time of arrival.
  - Step-by-step stop sequence with customer names, delivery demands (kg), and one-click Google Maps turn-by-turn navigation deep-links.
  - Dedicated Leaflet driver map displaying current driver location, next-stop waypoints, and the planned trajectory.
- **Cryptographic OTP Handshake Verification**:
  - Embedded 6-digit OTP verification modal.
  - Driver must collect the 6-digit code displayed on the customer's live tracking screen to verify handoff. The backend verifies the token and marks the delivery as completed.
- **Delivery Exception Reporting**:
  - If a delivery cannot be completed (e.g., premise locked, customer unavailable, damaged parcel), the driver logs an exception reason.
  - The system automatically reschedules the stop, re-routes the remaining sequence, and schedules a return-to-hub check-in at the central facility.

---

### 3. Consignment Tracking Portal (`CustomerDashboard`)

A clean, accessible web portal for end-customers to track their deliveries in real time without requiring account credentials.

- **Tokenized Access**: Customers track their consignment using a unique tracking token provided at dispatch.
- **Live Progress Stepper**:
  - Visual status progress: *Dispatched* ➔ *In Transit* ➔ *Out for Delivery* ➔ *Delivered* (or *Exception Logged*).
- **Live Delivery OTP Handshake Display**:
  - Displays the 6-digit verification code to share with the delivery driver upon arrival.
  - Includes a real-time countdown timer showing token validity.
  - Includes an on-demand "Request New OTP" button if the previous token expires.
- **Consignment Metadata & ETA**:
  - Displays remaining stops ahead of the driver, estimated arrival time, assigned driver name, and central origin hub information.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 18, React-Leaflet, Leaflet GIS, Lucide Icons, Recharts |
| **Typography & Styling** | Inter (primary UI font), JetBrains Mono (technical codes & coordinates), Custom Design Tokens (Charcoal/Slate palette) |
| **Backend API** | FastAPI (Python 3.10+), Uvicorn ASGI, Pydantic v2 |
| **Optimization & Algorithms** | NumPy, SciPy, NetworkX, Google OR-Tools (Constraint Programming) |
| **Security & Authentication**| PyJWT (JSON Web Tokens), Passlib (PBKDF2 SHA-256), Role-based authorization |
| **Geocoding & Spatial** | OpenStreetMap Nominatim, Haversine Spatial Geodesic Formula |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Python**: v3.10, v3.11, or v3.12

---

### 1. Backend Installation & Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI development server:
   ```bash
   python main.py
   ```
   *The backend will start at `http://localhost:8000`. Interactive API documentation (Swagger UI) is available at `http://localhost:8000/docs`.*

---

### 2. Frontend Installation & Setup

1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   *The frontend application will open automatically at `http://localhost:3000`.*

---

### 3. Demo Credentials

The platform includes role-isolated demo accounts for immediate testing:

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Full operations control, QPSO parameters, algorithm benchmarks, driver dispatch, fleet OTP ledger |
| **Field Driver** | `driver1` | `driver1` | Driver Cockpit, job batch claiming, turn-by-turn navigation, delivery OTP verification, exception reporting |
| **Customer** | *(Token-based)* | *(None)* | Tracking screen accessible via token entered on the login screen or via customer tracking URL |

---

## 📡 Core API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate operator or driver; returns JWT bearer token |
| `GET` | `/api/auth/me` | Fetch active authenticated user profile and permissions |
| `POST` | `/api/optimize` | Execute QPSO routing on specified waypoints, vehicles, and weights |
| `POST` | `/api/compare` | Run multi-algorithm benchmark (QPSO, PSO, GA, Dijkstra, OR-Tools) |
| `GET` | `/api/admin/fleet/live` | Fetch live fleet telemetry, active driver coordinates, and pending tasks |
| `GET` | `/api/driver/jobs/available` | Retrieve available unassigned dispatch batches |
| `POST` | `/api/driver/jobs/accept` | Claim a batch job and calculate route from driver's GPS coordinates |
| `POST` | `/api/driver/otp/verify` | Verify customer's 6-digit delivery OTP token |
| `POST` | `/api/driver/stop/fail` | Log delivery exception and re-route remaining stops to central hub |
| `GET` | `/api/customer/track/{token}` | Fetch public real-time consignment status, ETA, and active OTP token |

---

## 🔒 Security & Operational Integrity

- **Cryptographic Handoff**: Delivery OTP tokens are generated on the server with deterministic SHA-256 entropy and time-to-live (TTL) expiry. Drivers cannot complete deliveries without physical confirmation from the customer.
- **Role Isolation**: Drivers can only view and update assignments allocated to their specific driver ID; they cannot access fleet-wide routing configurations or other drivers' routes.
- **Fail-Safe Exception Handling**: Parcel returns and failed attempts automatically adjust downstream route segments and trigger hub check-in protocols to maintain inventory custody.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
