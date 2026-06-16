# WasteIQ — AI-Powered Waste Volume Prediction Platform

**AI Open Innovation Challenge 2026 | Case 2: Waste Volume Prediction**
**Team:** AI See You Team — President University
**Team Leader:** Myat Min Thu

---

## Project Structure

```
wasteiq/
├── backend/          ← Django REST API (Python)
├── frontend/         ← React.js Dashboard (Vite + Chart.js + Leaflet)
├── mobile/           ← Flutter Driver App
└── README.md
```

---

## Build Progress

| Phase | Component | Status |
|-------|-----------|--------|
| Phase 1 | Django Backend — Models | ✅ Done |
| Phase 1 | Django Backend — Prediction Engine | ✅ Done |
| Phase 1 | Django Backend — 20 API Endpoints | ✅ Done |
| Phase 1 | GPS Simulator (fake moving trucks) | ✅ Done |
| Phase 1 | Weather — Open-Meteo free API | ✅ Done |
| Phase 1 | Seed Data (30 zones, 90d TPS, events) | ✅ Done |
| Phase 1 | Indonesia Public Holidays (Nager.Date API) | ✅ Done |
| Phase 2 | React Dashboard — 9 pages | ✅ Done |
| Phase 3 | Flutter Mobile App — 4 screens | ✅ Done |
| Phase 4 | Polish & demo prep | ✅ Done |

---

## Quick Start — Backend

```bash
cd backend

# Install dependencies
pip3 install -r requirements.txt --break-system-packages

# Run migrations
python3 manage.py migrate

# Seed all data
python3 manage.py seed_data

# Start server
python3 manage.py runserver
# → http://localhost:8000
```

> **Mac note:** prefix commands with `PYTHONPATH=/Library/Frameworks/Python.framework/Versions/3.13/lib/python3.13/site-packages` if Django is not found.

---

## API Documentation (Swagger UI)

Once the backend is running, open:

| URL | Description |
|-----|-------------|
| `http://localhost:8000/api/docs/` | **Swagger UI** — interactive API explorer |
| `http://localhost:8000/api/redoc/` | ReDoc — clean reference docs |
| `http://localhost:8000/api/schema/` | Raw OpenAPI 3 schema (JSON) |

---

## API Endpoints (all working)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zones/` | All 30 Jakarta zones with risk level |
| GET | `/api/zones/<id>/` | Zone detail + 24h predictions |
| GET | `/api/events/` | Crowd permit events |
| POST | `/api/events/` | Register event (auto-triggers prediction) |
| GET | `/api/predictions/` | All predictions (filter: zone, date, risk) |
| POST | `/api/predictions/generate/` | Run prediction for a zone |
| GET | `/api/predictions/heatmap/` | All zones with risk + color for map |
| POST | `/api/simulator/` | Scenario simulator |
| GET | `/api/fleet/` | Fleet vehicles (GPS ticks on each call) |
| GET | `/api/fleet/<id>/` | Vehicle detail |
| POST | `/api/fleet/dispatch/` | Dispatch trucks to a zone |
| GET | `/api/drivers/` | All drivers |
| POST | `/api/drivers/<id>/report/` | Submit field report |
| GET | `/api/reports/summary/` | Executive dashboard data |
| GET | `/api/model/performance/` | Prediction accuracy metrics |
| GET | `/api/weather/current/` | Jakarta live weather (Open-Meteo) |
| GET | `/api/weather/forecast/` | 24h Jakarta weather forecast |
| GET | `/api/routes/` | All route assignments (admin view) |
| GET | `/api/routes/my/?driver_id=<id>` | Driver's current active assignment |
| POST | `/api/routes/request/` | Auto-assign nearest eligible zone to driver |
| PUT | `/api/routes/<id>/complete/` | Complete route → triggers zone cooldown |

---

## Smart Route Assignment System

The system automatically assigns cleaning routes to drivers based on zone risk and vehicle proximity.

**Assignment rules:**
1. Driver presses **"Get Route"** in the mobile app
2. Backend finds all eligible zones — no active assignment AND cooldown expired
3. Sorts by risk level first (critical → high → medium → low), then by distance from the driver's vehicle GPS
4. Assigns the best zone exclusively — no other driver will get the same zone while it's active

**Zone cooldown after completion:**
| Risk Level | Cooldown |
|-----------|---------|
| Critical | 4 hours |
| High | 4 hours |
| Medium | 6 hours |
| Low | 6 hours |

**10 real drivers — 2 per Jakarta municipality:**
| Employee ID | Name | Area |
|------------|------|------|
| DLH-2001 | Budi Santoso | Central Jakarta |
| DLH-2002 | Agus Prasetyo | Central Jakarta |
| DLH-2003 | Hendra Wijaya | South Jakarta |
| DLH-2004 | Dedi Kurniawan | South Jakarta |
| DLH-2005 | Rudi Hartono | North Jakarta |
| DLH-2006 | Slamet Riyadi | North Jakarta |
| DLH-2007 | Wahyu Nugroho | East Jakarta |
| DLH-2008 | Eko Susanto | East Jakarta |
| DLH-2009 | Bambang Suryadi | West Jakarta |
| DLH-2010 | Fauzi Arifin | West Jakarta |

---

## Data Strategy

| Data | Source | Type |
|------|--------|------|
| TPS disposal history (90 days) | Seed script with realistic noise | Synthetic |
| Indonesia public holidays | [Nager.Date](https://date.nager.at) free API | Real |
| Crowd permit events (10 demo) | Seed script | Synthetic |
| Weather (current + forecast) | [Open-Meteo](https://open-meteo.com) free API | Real |
| Fleet GPS positions | Moving simulator (`gps_simulator.py`) | Simulated |
| 30 Jakarta zone coordinates | Real zone coordinates | Real |

---

## Prediction Algorithm

```
event_waste_kg = (event_coeff × attendees / 100) × (duration / 6) × weather_mult × day_mult

Risk:  critical > 180kg above baseline
       high     > 120kg
       medium   > 80kg
       low      ≤ 80kg
```

Event coefficients: food_festival=18.5, concert=9.2, night_market=14.2, marathon=4.1 ...
Weather multipliers: sunny=1.0, cloudy=1.05, rainy=1.15, storm=1.35
Day multipliers: weekday=1.0, weekend=1.25, holiday=1.45

---

## Quick Start — Flutter Mobile App

```bash
cd mobile

# Install dependencies
flutter pub get

# Run on Android emulator (backend must be running)
flutter run

# The app uses http://10.0.2.2:8000/api (Android emulator host)
# Change baseUrl in lib/services/api_service.dart for real device
```

**Login:** Use employee IDs DLH-2001 through DLH-2015

**Screens:**
- **Login** — employee ID auth against Django API
- **Route List** — priority-sorted zones by risk level, pull-to-refresh
- **Map** — OpenStreetMap with risk-colored zone circles, your location marker
- **Report** — field report submission with GPS capture

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Django 5.x + Django REST Framework |
| Web Dashboard | React.js + Vite + Chart.js + Leaflet.js |
| Mobile App | Flutter (Dart) + flutter_map |
| Database | PostgreSQL 18 (via Postgres.app) |
| Weather API | Open-Meteo (free, no key) |
| Holidays API | Nager.Date (free, no key) |
| Maps | OpenStreetMap via Leaflet.js |
