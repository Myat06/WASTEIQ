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

**Meanwhile, truck driver Budi (DLH-2005) is on the road with the WasteIQ mobile app.**

He opens the app on his phone. It automatically shows him a **priority route list** — not just a list of zones, but zones sorted by urgency. Critical zones are at the top. Each zone shows the predicted waste volume so Budi knows what to expect before he arrives.

He taps the Map tab — the same OpenStreetMap view as the web dashboard appears on his phone. He can see exactly which zones are red and where he is on the map.

After collecting waste at a zone, Budi notices an illegal dumping site. He taps **File Report**, picks "Illegal Dumping," types a short description, taps **Locate** to capture his GPS position, and submits. The report instantly appears in the web dashboard for the manager to action.

---

### Where the Intelligence Comes From

WasteIQ is not guessing. Every prediction is built from three real inputs:

1. **Historical waste data** — 90 days of daily records per zone, showing that Tanah Abang consistently generates more waste on weekends and that Monas spikes after any public event.

2. **Live weather** — Fetched automatically from a free weather API. Rain increases waste (wet food scraps, packaging) so the prediction adjusts upward by 15% on rainy days and 35% on stormy days.

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
| Drivers navigate by memory or phone calls | Drivers see a priority route list sorted by urgency |
| No visibility of where trucks are | Live map showing all 15 trucks moving in real time |
| Field reports via WhatsApp | Structured reports with GPS coordinates, logged to the system |
| No data on whether predictions were accurate | Model performance page tracks prediction accuracy per zone |

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL DATA SOURCES                    │
│                                                             │
│   Open-Meteo API          Nager.Date API                   │
│   (free weather API)      (Indonesia public holidays)       │
│   no API key needed       no API key needed                 │
└──────────────┬───────────────────┬──────────────────────────┘
               │                   │
               ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Django)                          │
│                   localhost:8000/api                        │
│                                                             │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  Database   │  │  Prediction  │  │  GPS Simulator   │  │
│   │ (PostgreSQL) │  │   Engine     │  │  (fake trucks)   │  │
│   └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│              16 REST API endpoints                          │
└─────────┬───────────────────────────────────┬───────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐           ┌───────────────────────────┐
│   WEB DASHBOARD     │           │     MOBILE APP            │
│   (React.js)        │           │     (Flutter)             │
│   localhost:5173    │           │     Android / iOS         │
│                     │           │                           │
│   9 pages for       │           │   4 screens for           │
│   operations        │           │   truck drivers           │
│   managers          │           │                           │
└─────────────────────┘           └───────────────────────────┘
```

---

## File Structure (only the important files)

```
wasteiq/
│
├── SYSTEM_BREAKDOWN.md          ← this file
├── README.md                    ← quick start guide
├── CLAUDE.md                    ← developer notes
│
├── backend/                     ← Django REST API
│   ├── manage.py                ← Django entry point (run commands from here)
│   ├── requirements.txt         ← Python packages needed
│   ├── db.sqlite3               ← the database file (auto-created)
│   │
│   ├── wasteiq/                 ← Django project settings
│   │   ├── settings.py          ← database config, CORS, timezone (Asia/Jakarta)
│   │   └── urls.py              ← routes all requests to api/
│   │
│   └── api/                     ← main application code
│       ├── models.py            ← database table definitions (7 tables)
│       ├── views.py             ← 16 API endpoints (what the server responds with)
│       ├── urls.py              ← maps URL paths to views
│       ├── serializers.py       ← converts database objects to JSON
│       ├── prediction.py        ← waste prediction algorithm
│       ├── weather.py           ← fetches weather from Open-Meteo
│       ├── gps_simulator.py     ← simulates truck movement on map
│       └── management/
│           └── commands/
│               └── seed_data.py ← fills database with demo data
│
├── frontend/                    ← React.js Web Dashboard
│   ├── package.json             ← JavaScript packages needed
│   ├── index.html               ← entry point HTML
│   │
│   └── src/
│       ├── main.jsx             ← starts the React app
│       ├── App.jsx              ← defines all 9 page routes + sidebar layout
│       │
│       ├── components/          ← reusable UI pieces
│       │   ├── Sidebar.jsx      ← left navigation menu
│       │   ├── RiskBadge.jsx    ← colored CRITICAL / HIGH / MEDIUM / LOW label
│       │   ├── StatCard.jsx     ← summary number card
│       │   └── PageHeader.jsx   ← page title bar
│       │
│       ├── pages/               ← one folder per page
│       │   ├── dashboard/       → overview: weather, risk summary, live stats
│       │   ├── map/             → Leaflet map with colored zone circles
│       │   ├── predictions/     → table of all zone predictions
│       │   ├── simulator/       → input an event, see instant prediction
│       │   ├── fleet/           → live GPS positions of all trucks
│       │   ├── drivers/         → list of all drivers and their zones
│       │   ├── reports/         → field reports submitted by drivers
│       │   ├── data/            → raw TPS historical data table
│       │   └── performance/     → prediction accuracy metrics
│       │
│       └── services/
│           ├── api.js           ← all HTTP calls to the backend (axios)
│           └── constants.js     ← colors, labels for risk levels
│
└── mobile/                      ← Flutter Mobile App
    ├── pubspec.yaml             ← Flutter packages needed
    │
    └── lib/                     ← all Dart source code
        ├── main.dart            ← app entry point, theme, routing
        │
        ├── services/
        │   ├── api_service.dart ← HTTP calls to backend
        │   └── session.dart     ← saves login info on device (SharedPreferences)
        │
        ├── providers/           ← Riverpod state management
        │   ├── auth_provider.dart        ← login / logout / session restore
        │   ├── predictions_provider.dart ← fetch zone predictions + heatmap
        │   ├── report_provider.dart      ← report form state + GPS capture
        │   └── summary_provider.dart     ← zone summary stats
        │
        ├── screens/             ← 4 app screens
        │   ├── login_screen.dart      ← employee ID login
        │   ├── route_list_screen.dart ← priority route list for driver
        │   ├── map_screen.dart        ← OpenStreetMap with risk zones
        │   └── report_screen.dart     ← file a field report
        │
        └── widgets/
            └── risk_badge.dart  ← reusable colored risk label (same as web)
```

---

## How the Data Flows

### 1. When you start the backend for the first time

```
python3 manage.py migrate
     │
     └─► Creates db.sqlite3 with empty tables:
         Zone, EventPermit, TPSRecord, Prediction,
         FleetVehicle, Driver, FieldReport

python3 manage.py seed_data
     │
     ├─► Calls Nager.Date API → gets Indonesia public holidays for 2024–2025
     ├─► Calls Open-Meteo API → gets real Jakarta weather
     ├─► Creates 30 Jakarta zones (all 5 municipalities)
     ├─► Creates 15 truck drivers (DLH-2001 to DLH-2015)
     ├─► Creates 15 fleet vehicles with starting GPS coordinates
     ├─► Creates 10 demo crowd events (food festivals, concerts, marathons...)
     ├─► Generates 2,700 TPS records (90 days × 30 zones of historical data)
     └─► Generates 720 predictions (24 hours × 30 zones for today)
```

### 2. When the web dashboard loads a page

```
User opens browser → React page loads
     │
     └─► React calls backend API (e.g. GET /api/predictions/)
              │
              └─► Django view runs → queries database → returns JSON
                       │
                       └─► React renders the data as charts / tables / map
```

### 3. When a prediction is calculated

```
Input:  zone + date + event info (type, attendees, duration)
     │
     ▼
prediction.py runs the formula:
     │
     ├─► Gets weather from Open-Meteo → weather multiplier (sunny=1.0, storm=1.35)
     ├─► Checks if date is holiday → day multiplier (weekday=1.0, holiday=1.45)
     ├─► Gets event coefficient (food_festival=18.5 kg/100 people, concert=9.2...)
     │
     └─► Formula:
         event_waste_kg = (event_coeff × attendees ÷ 100)
                        × (duration_hours ÷ 6)
                        × weather_multiplier
                        × day_multiplier

         total = baseline_waste + event_waste_kg

         Risk level:
           > 180 kg above baseline → CRITICAL (red)
           > 120 kg above baseline → HIGH (orange)
           >  80 kg above baseline → MEDIUM (yellow)
           ≤  80 kg above baseline → LOW (green)
```

### 4. How the GPS truck simulation works

```
Every time frontend calls GET /api/fleet/
     │
     └─► gps_simulator.py runs tick_fleet()
              │
              ├─► Each truck moves ~90 meters toward its target zone
              ├─► When truck arrives at target → picks a new random zone
              └─► Returns updated coordinates
                       │
                       └─► Frontend shows trucks moving on the map
```

### 5. How the driver mobile app works

```
Driver opens app
     │
     ├─► [First time] Checks SharedPreferences for saved session
     │        └─► No session found → show Login Screen
     │
     ├─► Login Screen
     │        ├─► Driver types employee ID (e.g. DLH-2001)
     │        ├─► App calls GET /api/drivers/ → finds matching driver
     │        ├─► Saves driver info to phone storage (SharedPreferences)
     │        └─► Navigate to Route List
     │
     ├─► Route List Screen
     │        ├─► Calls GET /api/predictions/?zone=<assigned_zone>
     │        ├─► Sorts zones by risk: CRITICAL first, LOW last
     │        ├─► Shows summary card: total waste kg, critical count
     │        └─► Buttons: Map (top right), File Report (floating)
     │
     ├─► Map Screen
     │        ├─► Calls GET /api/predictions/heatmap/
     │        ├─► Draws OpenStreetMap tiles (OpenStreetMap, free)
     │        ├─► Draws colored circles on each zone (color = risk level)
     │        └─► Shows driver's own location as green person icon
     │
     └─► Report Screen
              ├─► Driver picks report type (TPS Overflow, Road Blocked, etc.)
              ├─► Types description
              ├─► Taps "Locate" → captures GPS coordinates
              └─► Taps "Submit" → POST /api/drivers/<id>/report/
                       └─► Shows success screen
```

---

## Database Tables

| Table | What it stores |
|-------|---------------|
| `Zone` | 30 Jakarta zones with name, municipality, GPS coordinates |
| `EventPermit` | Crowd events (concerts, food festivals) with attendee count, location |
| `TPSRecord` | Historical daily waste records per zone (90 days of synthetic data) |
| `Prediction` | AI-generated waste predictions per zone per hour |
| `FleetVehicle` | 15 trucks with current GPS position, status, capacity |
| `Driver` | 15 drivers with employee ID, name, assigned zone |
| `FieldReport` | Reports submitted by drivers from mobile app |

---

## API Endpoints (16 total)

| Method | Endpoint | Used by |
|--------|----------|---------|
| GET | `/api/zones/` | Web: map, predictions |
| GET | `/api/zones/<id>/` | Web: zone detail |
| GET | `/api/events/` | Web: event list |
| POST | `/api/events/` | Web: create event |
| GET | `/api/predictions/` | Web + Mobile: prediction list |
| POST | `/api/predictions/generate/` | Web: generate new prediction |
| GET | `/api/predictions/heatmap/` | Web + Mobile: map coloring |
| POST | `/api/simulator/` | Web: what-if scenario |
| GET | `/api/fleet/` | Web: truck positions (ticks GPS) |
| GET | `/api/fleet/<id>/` | Web: single truck |
| POST | `/api/fleet/dispatch/` | Web: send trucks to zone |
| GET | `/api/drivers/` | Mobile: login validation |
| POST | `/api/drivers/<id>/report/` | Mobile: submit field report |
| GET | `/api/reports/summary/` | Web + Mobile: dashboard stats |
| GET | `/api/model/performance/` | Web: accuracy metrics |
| GET | `/api/weather/current/` | Web: live weather widget |
| GET | `/api/weather/forecast/` | Web: 24h forecast |

---

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Python + Django + Django REST Framework | Fast API development, clean ORM |
| Database | SQLite | Zero setup for prototype/demo |
| Web Frontend | React.js + Vite | Component-based, fast dev server |
| Charts | Chart.js | Simple, beautiful charts |
| Web Maps | Leaflet.js + OpenStreetMap | Free, no API key needed |
| Mobile | Flutter (Dart) | Single codebase for Android + iOS |
| Mobile Maps | flutter_map + OpenStreetMap | Free, no API key needed |
| Mobile State | Riverpod 2.x | Clean async state management |
| Weather Data | Open-Meteo API | Free, no signup, accurate |
| Holiday Data | Nager.Date API | Free, official holiday list |

---

## How to Run Everything

```bash
# Step 1 — Start the backend
cd wasteiq/backend
python3 manage.py migrate        # set up database (first time only)
python3 manage.py seed_data      # fill with demo data (first time only)
python3 manage.py runserver      # start API server at localhost:8000

# Step 2 — Start the web dashboard (new terminal)
cd wasteiq/frontend
npm install                      # first time only
npm run dev                      # open localhost:5173 in browser

# Step 3 — Run the mobile app (new terminal, need Android emulator)
cd wasteiq/mobile
flutter pub get                  # first time only
flutter run                      # launches on emulator
# Login with any ID from DLH-2001 to DLH-2015
```

---

## Data Sources Summary

| Data | Where it comes from | Real or Fake? |
|------|---------------------|---------------|
| 90 days of waste history | Generated by seed script with realistic noise | Synthetic |
| Indonesia public holidays | Nager.Date free API (live call during seed) | Real |
| Jakarta weather (current) | Open-Meteo free API (live call every request) | Real |
| Event crowd permits | 10 demo events created by seed script | Synthetic |
| Truck GPS positions | gps_simulator.py moves trucks each API call | Simulated |
| Zone coordinates | Real Jakarta area coordinates | Real |
| Driver employee IDs | DLH-2001 to DLH-2015 (demo accounts) | Synthetic |
