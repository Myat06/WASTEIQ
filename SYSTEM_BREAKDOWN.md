# WasteIQ — System Breakdown

**AI Open Innovation Challenge 2026 | Case 2: Waste Volume Prediction**
**Team:** AI See You Team — President University

---

## What is WasteIQ?

WasteIQ is an AI-powered waste management platform built for **DLH DKI Jakarta** (Jakarta's waste management department). The system predicts how much waste will be generated in each zone of Jakarta based on events, weather, and historical data — then helps drivers prioritize which zones to collect from first.

The system has **3 layers**:
1. A **backend server** (the brain) that stores data and runs predictions
2. A **web dashboard** (for operations managers) to monitor the whole city
3. A **mobile app** (for truck drivers) to see their routes and file reports

---

## How It Works — Plain English

### The Problem It Solves

Right now, Jakarta's waste trucks are sent out **after** bins overflow. A driver gets a complaint call, drives to the zone, and collects — but by then, the street is already a mess. This is reactive. WasteIQ flips that around: it tells operations managers **before** the overflow happens, so trucks are already in position.

---

### The Story of One Day

**Monday morning, 7 AM — an operations manager at DLH opens the WasteIQ web dashboard.**

The first thing they see is a live summary of Jakarta's 30 waste zones:
- How much total waste is predicted for today
- Which zones are flagged as **Critical** (urgent), **High**, **Medium**, or **Low** risk
- Current Jakarta weather (because rain increases waste generation)
- Any upcoming public events that will spike waste production

**They click on the Live Map.**

A map of Jakarta appears with colored circles on each zone — red for critical, orange for high, green for low. Tiny truck icons move around the map in real time, showing where each fleet vehicle currently is. The manager can instantly see: *"Zone Tanah Abang is critical, and the nearest truck is 2 km away."*

**They check the Predictions page.**

For each zone, the system shows an hourly forecast for the next 24 hours — a line chart showing waste generation from midnight to midnight. The manager can see not just *that* Tanah Abang will be critical, but *when*: waste peaks at 11 AM (market opening) and again at 6 PM (evening crowd). They can schedule truck arrivals to match those peaks.

**A crowd permit comes in — there's a food festival at Monas this Saturday, 5,000 attendees, 8 hours.**

The manager opens the **Scenario Simulator** and types in those details. In under a second, WasteIQ calculates:
- Estimated waste generated: 925 kg above the normal baseline
- Risk level: **Critical**
- Workers needed: 6 people
- Trucks needed: 2 vehicles
- Temporary bins needed: 1 extra bin unit
- Recommended action: Pre-position Fleet 03 and Fleet 11 by 9 AM Saturday

This replaces what used to be a manual estimate done on a spreadsheet — or worse, no estimate at all.

---

**Meanwhile, truck driver Budi (DLH-2001) is on the road with the WasteIQ mobile app.**

He opens the app on his phone. He taps **Get Route** — the system assigns him the highest-priority zone nearest to his vehicle's current GPS position. The app shows the zone name, predicted waste volume, risk level, and estimated distance.

He taps the Map tab — an OpenStreetMap view shows all zones color-coded by risk, his location, and a road-optimized route to his zone via OSRM routing.

After collecting waste at a zone, he taps **Complete Route**. The system marks the zone as cleaned, applies a cooldown (4–6 hours depending on risk level), and Budi can request his next assignment.

He also notices an illegal dumping site along the way. He taps **File Report**, picks "Illegal Dumping," types a short description, taps **Locate** to capture his GPS position, and submits. The report instantly appears in the web dashboard for the manager to action.

---

### Where the Intelligence Comes From

WasteIQ is not guessing. Every prediction is built from three real inputs:

1. **Historical waste data** — 90 days of daily records per zone, showing that Tanah Abang consistently generates more waste on weekends and that Monas spikes after any public event.

2. **Live weather** — Fetched automatically from Open-Meteo (free, no API key). Rain increases waste (wet food scraps, packaging) so the prediction adjusts upward by 15% on rainy days and 35% on stormy days.

3. **Event multipliers** — Each event type has a measured waste coefficient based on how many kilograms of waste 100 people produce per event type. A food festival generates 18.5 kg per 100 attendees; a marathon generates only 4.1 kg (runners don't leave much trash). These numbers are applied automatically when an event permit is submitted.

The output is a risk classification:
- More than 180 kg above the zone's normal daily baseline → **Critical** (red)
- More than 120 kg above baseline → **High** (orange)
- More than 80 kg above baseline → **Medium** (yellow)
- 80 kg or less above baseline → **Low** (green)

---

### What Changes for DLH

| Before WasteIQ | After WasteIQ |
|----------------|---------------|
| Trucks dispatched after overflow complaints | Trucks pre-positioned before the zone fills |
| Manual spreadsheet estimates for events | Instant prediction the moment a permit is entered |
| Drivers navigate by memory or phone calls | Smart route assignment sorted by urgency + proximity |
| No visibility of where trucks are | Live map showing all 10 trucks moving in real time |
| Field reports via WhatsApp | Structured reports with GPS coordinates, logged to the system |
| No data on whether predictions were accurate | Model performance page tracks prediction accuracy per zone |
| No admin control | Full Django admin panel to manage users, zones, drivers, events |

---

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      EXTERNAL DATA SOURCES                        │
│                                                                  │
│   Open-Meteo API          Nager.Date API       OSRM Routing     │
│   (live weather)          (public holidays)    (road routes)     │
│   free, no key            free, no key         free, no key      │
└──────────────┬──────────────────┬────────────────────────────────┘
               │                  │
               ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND (Django 5.x + DRF)                     │
│              localhost:8000  (0.0.0.0:8000 for devices)          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Database    │  │  Prediction  │  │    GPS Simulator      │  │
│  │  SQLite      │  │   Engine     │  │   (fake moving trucks)│  │
│  │  (default)   │  │ prediction.py│  │   gps_simulator.py   │  │
│  │  PostgreSQL  │  └──────────────┘  └───────────────────────┘  │
│  │  (optional)  │                                                │
│  └──────────────┘  ┌──────────────┐  ┌───────────────────────┐  │
│                    │  Admin Panel │  │   Swagger UI          │  │
│                    │  /admin/     │  │   /api/docs/          │  │
│                    │  9 models    │  │   (local assets)      │  │
│                    └──────────────┘  └───────────────────────┘  │
│                                                                  │
│                     21 REST API endpoints                        │
└──────────┬──────────────────────────────────────┬───────────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────┐              ┌────────────────────────────┐
│   WEB DASHBOARD      │              │     MOBILE APP             │
│   (React.js + Vite)  │              │     (Flutter + Riverpod)   │
│   localhost:5173     │              │     iOS / Android          │
│                      │              │                            │
│   10 pages for       │              │   5 screens for            │
│   operations         │              │   truck drivers            │
│   managers           │              │                            │
└──────────────────────┘              └────────────────────────────┘
```

---

## File Structure (important files only)

```
wasteiq/
│
├── SYSTEM_BREAKDOWN.md          ← this file
├── README.md                    ← quick start guide
├── CLAUDE.md                    ← developer notes
│
├── backend/                     ← Django REST API
│   ├── manage.py                ← Django entry point
│   ├── requirements.txt         ← Python packages
│   │
│   ├── wasteiq/                 ← Django project config
│   │   ├── settings.py          ← dual DB config, CORS, ATS, timezone
│   │   └── urls.py              ← routes + Swagger UI + Admin
│   │
│   └── api/                     ← main application
│       ├── models.py            ← 9 database models
│       ├── views.py             ← 21 API endpoints
│       ├── urls.py              ← URL → view mapping
│       ├── serializers.py       ← DB objects → JSON
│       ├── admin.py             ← Django admin (all 9 models registered)
│       ├── prediction.py        ← waste prediction algorithm
│       ├── weather.py           ← Open-Meteo integration
│       ├── gps_simulator.py     ← simulates truck movement
│       └── management/commands/
│           └── seed_data.py     ← seeds all demo data
│
├── frontend/                    ← React.js Web Dashboard
│   └── src/
│       ├── App.jsx              ← 10 page routes + sidebar layout
│       ├── pages/               ← one folder per page
│       │   ├── dashboard/       → overview: weather, risk summary, live stats
│       │   ├── map/             → Leaflet map with colored zone circles
│       │   ├── predictions/     → table of all zone predictions
│       │   ├── simulator/       → input an event, get instant prediction
│       │   ├── fleet/           → live GPS positions of all trucks
│       │   ├── drivers/         → list of drivers and zones
│       │   ├── reports/         → field reports from drivers
│       │   ├── data/            → raw TPS historical data + CSV import
│       │   ├── performance/     → prediction accuracy metrics
│       │   ├── routes/          → route assignments (admin view)
│       │   └── calendar/        → events calendar with waste forecast
│       └── services/
│           ├── api.js           ← all HTTP calls (axios)
│           └── constants.js     ← risk level colors/labels
│
└── mobile/                      ← Flutter Driver App
    └── lib/
        ├── main.dart            ← entry point, theme, routing
        ├── services/
        │   ├── api_service.dart ← all HTTP calls (baseUrl config here)
        │   ├── session.dart     ← login session + active route (SharedPreferences)
        │   ├── cache_service.dart       ← offline data caching
        │   └── notification_service.dart ← local push notifications
        ├── providers/           ← Riverpod state
        │   ├── auth_provider.dart        ← login/logout/session restore
        │   ├── route_provider.dart       ← route request/complete logic
        │   ├── predictions_provider.dart ← zone predictions + heatmap
        │   ├── report_provider.dart      ← report form + GPS capture
        │   ├── summary_provider.dart     ← dashboard stats
        │   ├── history_provider.dart     ← past reports
        │   └── route_polyline_provider.dart ← OSRM road routing
        └── screens/
            ├── login_screen.dart        ← employee ID login
            ├── route_list_screen.dart   ← Get Route / Complete Route
            ├── map_screen.dart          ← OpenStreetMap + risk circles
            ├── report_screen.dart       ← file a field report
            └── history_screen.dart      ← past reports by this driver
```

---

## How the Data Flows

### 1. First-time backend setup

```
python3 manage.py migrate
     │
     └─► Creates database tables:
         Zone, EventPermit, TPSRecord, Prediction,
         FleetVehicle, Driver, RouteAssignment,
         RouteZoneStop, FieldReport

python3 manage.py seed_data
     │
     ├─► Calls Nager.Date API → Indonesia public holidays
     ├─► Calls Open-Meteo API → real Jakarta weather
     ├─► Creates 30 Jakarta zones (all 5 municipalities)
     ├─► Creates 10 truck drivers (DLH-2001 to DLH-2010)
     ├─► Creates 10 fleet vehicles with starting GPS coordinates
     ├─► Creates 10 demo crowd events
     ├─► Generates 2,700 TPS records (90 days × 30 zones)
     └─► Generates 720 predictions (24 hours × 30 zones)
```

### 2. Web dashboard page load

```
User opens browser → React page loads
     │
     └─► React calls backend API (e.g. GET /api/predictions/)
              │
              └─► Django view queries database → returns JSON
                       │
                       └─► React renders charts / tables / map
```

### 3. Waste prediction calculation

```
Input: zone + date + event info (type, attendees, duration)
     │
     ▼
prediction.py:
     ├─► Weather from Open-Meteo → multiplier (sunny=1.0, storm=1.35)
     ├─► Holiday check → day multiplier (weekday=1.0, holiday=1.45)
     ├─► Event coefficient (food_festival=18.5 kg/100 people, ...)
     │
     └─► Formula:
         event_waste = (coeff × attendees ÷ 100) × (duration ÷ 6) × weather × day
         total = baseline + event_waste

         Risk: > 180kg above baseline → CRITICAL
               > 120kg → HIGH
               >  80kg → MEDIUM
               ≤  80kg → LOW
```

### 4. GPS truck simulation

```
Every time frontend calls GET /api/fleet/
     │
     └─► gps_simulator.py → tick_fleet()
              ├─► Each truck moves ~90m toward its target zone
              ├─► On arrival → picks a new random zone as target
              └─► Returns updated GPS coordinates to frontend
```

### 5. Smart route assignment (mobile)

```
Driver taps "Get Route"
     │
     └─► POST /api/routes/request/
              ├─► Finds all eligible zones (no active route, cooldown expired)
              ├─► Scores each zone: risk level first, then distance from driver
              ├─► Picks top 3 zones, optimizes order (nearest-neighbor)
              ├─► Creates RouteAssignment + RouteZoneStop records
              └─► Returns assignment to app → shows first zone

Driver taps "Complete Route"
     │
     └─► PUT /api/routes/<id>/complete/
              ├─► Marks all stops completed
              ├─► Sets cooldown (4h critical/high, 6h medium/low)
              ├─► Frees vehicle back to idle
              └─► Driver can request next route after cooldown
```

### 6. Mobile app session flow

```
App starts
     │
     ├─► Checks SharedPreferences for saved session
     │        ├─► Found → go to Route List (skip login)
     │        └─► Not found → show Login Screen
     │
     ├─► Login Screen
     │        ├─► Driver types employee ID (e.g. DLH-2001)
     │        ├─► GET /api/drivers/ → find matching driver
     │        ├─► Save session to SharedPreferences
     │        └─► Navigate to Route List
     │
     ├─► Route List Screen
     │        ├─► GET /api/routes/my/?driver_id=<id>
     │        ├─► If no active route → show "Get Route" button
     │        ├─► If active route → show zone card + "Complete Route" button
     │        └─► Buttons: Map, History, File Report, Logout
     │
     ├─► Map Screen
     │        ├─► GET /api/predictions/heatmap/
     │        ├─► OpenStreetMap tiles
     │        ├─► Colored circles per zone (color = risk level)
     │        └─► Driver location marker + OSRM road route polyline
     │
     ├─► Report Screen
     │        ├─► Pick report type, type description
     │        ├─► Tap "Locate" → capture GPS
     │        ├─► Optional: attach photo
     │        └─► POST /api/drivers/<id>/report/ → success screen
     │
     └─► History Screen
              └─► GET /api/drivers/<id>/report/ → list of past reports
```

---

## Database Tables (9 models)

| Table | What it stores | Rows (seeded) |
|-------|---------------|---------------|
| `Zone` | 30 Jakarta zones with GPS coordinates | 30 |
| `EventPermit` | Crowd events with attendee count, location | 10 |
| `TPSRecord` | Historical daily waste records (90 days) | 2,700 |
| `Prediction` | AI-generated waste predictions per zone/hour | 720 |
| `FleetVehicle` | 10 trucks with GPS position and status | 10 |
| `Driver` | 10 drivers with employee ID, name, zone | 10 |
| `RouteAssignment` | Route assigned to a driver (active/completed) | live |
| `RouteZoneStop` | Ordered zone stops within a route | live |
| `FieldReport` | Reports submitted by drivers from mobile app | live |

---

## API Endpoints (21 total)

| Method | Endpoint | Used by |
|--------|----------|---------|
| GET | `/api/zones/` | Web + Mobile: zone list with risk |
| GET | `/api/zones/<id>/` | Web: zone detail + 24h forecast |
| GET | `/api/events/` | Web: event list |
| POST | `/api/events/` | Web: register event → triggers prediction |
| GET | `/api/events/calendar/` | Web: calendar view grouped by date |
| GET | `/api/predictions/` | Web: prediction table |
| POST | `/api/predictions/generate/` | Web: generate prediction for zone |
| GET | `/api/predictions/heatmap/` | Web + Mobile: map risk circles |
| POST | `/api/simulator/` | Web: what-if scenario |
| GET | `/api/fleet/` | Web: truck positions (ticks GPS simulator) |
| GET | `/api/fleet/<id>/` | Web: single truck |
| POST | `/api/fleet/dispatch/` | Web: send trucks to zone |
| GET | `/api/drivers/` | Mobile: login validation |
| POST | `/api/drivers/<id>/report/` | Mobile: submit field report |
| GET | `/api/drivers/<id>/report/` | Mobile: get past reports |
| GET | `/api/reports/summary/` | Web + Mobile: dashboard stats |
| GET | `/api/model/performance/` | Web: accuracy metrics |
| GET | `/api/weather/current/` | Web: live weather |
| GET | `/api/weather/forecast/` | Web: 24h forecast |
| GET | `/api/routes/` | Web: all route assignments |
| GET | `/api/routes/my/?driver_id=<id>` | Mobile: driver's active route |
| POST | `/api/routes/request/` | Mobile: request new route |
| PUT | `/api/routes/<id>/complete/` | Mobile: complete route |
| POST | `/api/data/import/` | Web: import CSV waste records |

---

## Known Bugs Fixed

| Bug | Location | Fix |
|-----|----------|-----|
| `select_related('zone__predictions')` on reverse FK crashed `/routes/<id>/complete/` with 500 error | `api/views.py:route_complete` | Changed to `prefetch_related` |
| Empty response body (`null`) from `/routes/my/` caused `jsonDecode('')` to crash | `mobile/lib/services/api_service.dart:getMyRoute` | Added `if (res.body.isEmpty) return null` |
| Swagger UI hung loading from CDN | `wasteiq/settings.py` | Set `SWAGGER_UI_DIST: 'SIDECAR'` — assets served locally |
| iOS Simulator blocked HTTP connections (ATS) | `ios/Runner/Info.plist` | Added `NSAllowsArbitraryLoads: true` |
| HTTP requests had no timeout — hung forever on wrong IP | `api_service.dart` | Added `.timeout(Duration(seconds: 10))` to all requests |

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Python + Django 5.x + DRF | Fast API, clean ORM |
| API Docs | drf-spectacular + sidecar | Local Swagger UI, no CDN |
| Database | SQLite (default) / PostgreSQL | SQLite = zero setup for demo |
| Web Frontend | React.js + Vite | Component-based, fast dev server |
| Charts | Chart.js | Simple, good-looking charts |
| Web Maps | Leaflet.js + OpenStreetMap | Free, no API key |
| Mobile | Flutter (Dart) | Single codebase for Android + iOS |
| Mobile State | Riverpod 2.x | Clean async state management |
| Mobile Maps | flutter_map + OpenStreetMap | Free, no API key |
| Road Routing | OSRM (free public API) | Real road routes, no API key |
| Weather | Open-Meteo | Free, Jakarta coordinates |
| Holidays | Nager.Date | Free, Indonesia public holidays |

---

## How to Run Everything

```bash
# ── Backend (Terminal 1) ──────────────────────────────────────────
cd wasteiq/backend
pip3 install -r requirements.txt --break-system-packages   # first time
python3 manage.py migrate                                   # first time
python3 manage.py seed_data                                 # first time
python3 manage.py runserver 0.0.0.0:8000
# → API:   http://localhost:8000/api/
# → Docs:  http://localhost:8000/api/docs/
# → Admin: http://localhost:8000/admin/  (admin / admin1234)

# ── Frontend (Terminal 2) ─────────────────────────────────────────
cd wasteiq/frontend
npm install          # first time
npm run dev
# → http://localhost:5173

# ── Mobile (Terminal 3) ───────────────────────────────────────────
cd wasteiq/mobile
flutter pub get      # first time
flutter run
# Set baseUrl in lib/services/api_service.dart first (see README)
# Login: DLH-2001 to DLH-2010
```

---

## Data Sources Summary

| Data | Source | Real or Synthetic? |
|------|--------|-------------------|
| 90 days of waste history | Seed script with realistic noise | Synthetic |
| Indonesia public holidays | Nager.Date free API | Real |
| Jakarta weather (live) | Open-Meteo free API | Real |
| Event crowd permits | 10 demo events from seed script | Synthetic |
| Truck GPS positions | gps_simulator.py per API call | Simulated |
| Zone coordinates | Real Jakarta area coordinates | Real |
| Driver accounts | DLH-2001 to DLH-2010 | Synthetic |
