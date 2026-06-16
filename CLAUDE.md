# WasteIQ — CLAUDE.md

## Project Overview
AI-powered waste volume prediction platform for DLH DKI Jakarta.
AI Open Innovation Challenge 2026 | Case 2: Waste Volume Prediction
Team: AI See You Team | Leader: Myat Min Thu | President University

---

## Mac Python Commands

Always prefix Django management commands if `django-admin` is not on PATH:

```bash
PYTHONPATH=/Library/Frameworks/Python.framework/Versions/3.13/lib/python3.13/site-packages python3 -m django <command>
# or just:
python3 manage.py <command>
```

---

## Running the Full Stack

### 1. Backend (Django)
```bash
cd wasteiq/backend
python3 manage.py runserver 0.0.0.0:8000
# → API:   http://localhost:8000/api/
# → Docs:  http://localhost:8000/api/docs/
# → Admin: http://localhost:8000/admin/
```

> Use `0.0.0.0:8000` (not just `runserver`) so the Flutter app on iOS Simulator and real devices can reach it.

### 2. Frontend (React)
```bash
cd wasteiq/frontend
npm run dev
# → http://localhost:5173
```

### 3. Mobile (Flutter)
```bash
cd wasteiq/mobile
flutter pub get
flutter run
# Set baseUrl in lib/services/api_service.dart before running
```

---

## Database Configuration

Settings auto-detect via environment variable in `backend/wasteiq/settings.py`:

```bash
# SQLite (default — zero setup, for dev/demo/sharing)
python3 manage.py runserver 0.0.0.0:8000

# PostgreSQL (optional — for production)
USE_POSTGRES=true python3 manage.py runserver 0.0.0.0:8000
```

PostgreSQL credentials (when USE_POSTGRES=true):
- DB: `wasteiq_db`
- User: `postgres`
- Password: `1234`
- Host: `localhost:5432`

Both databases are seeded and consistent (30 zones, 10 drivers, 720 predictions, 2700 TPS records).

---

## Django Admin Panel

URL: `http://localhost:8000/admin/`

Superuser credentials:
```
Username: admin
Password: admin1234
```

All 9 models registered: Zone, Driver, FleetVehicle, EventPermit, TPSRecord, Prediction, RouteAssignment, RouteZoneStop, FieldReport.

Create superuser on a fresh DB:
```bash
python3 manage.py createsuperuser --username admin --email admin@wasteiq.com --noinput
python3 manage.py shell -c "from django.contrib.auth.models import User; u=User.objects.get(username='admin'); u.set_password('admin1234'); u.save()"
```

---

## Architecture

### Backend — `wasteiq/backend/`
- **Django 5.x + DRF** — 21 REST API endpoints + 3 Swagger endpoints
- **`api/prediction.py`** — coefficient-based prediction engine (no ML model)
- **`api/weather.py`** — Open-Meteo free API (Jakarta: -6.2, 106.8), no key needed
- **`api/gps_simulator.py`** — `tick_fleet()` moves trucks ~90m per API call
- **`api/admin.py`** — all 9 models registered with search, filter, list_display
- **`api/management/commands/seed_data.py`** — seeds 30 zones, 10 drivers, 10 trucks, 10 events, 2700 TPS records, 720 predictions

### Frontend — `wasteiq/frontend/`
- **React.js + Vite + Chart.js + Leaflet.js**
- 10 pages: Dashboard, Map, Predictions, Simulator, Fleet, Drivers, Reports, Data, Performance, Calendar, Routes
- All API calls via `src/services/api.js` (axios, baseURL: http://localhost:8000/api)

### Mobile — `wasteiq/mobile/`
- **Flutter 3.x + Riverpod 2.x**
- **State management**: `flutter_riverpod` — all async data through providers
- **5 screens**: Login → RouteList → Map → Report → History
- **Base URL**: configured in `lib/services/api_service.dart`

#### baseUrl by platform
| Platform | baseUrl |
|----------|---------|
| iOS Simulator | `http://127.0.0.1:8000/api` |
| Android Emulator | `http://10.0.2.2:8000/api` |
| Real device (WiFi) | `http://<mac-ip>:8000/api` — get IP with `ipconfig getifaddr en0` |

#### iOS ATS Config
`mobile/ios/Runner/Info.plist` has `NSAllowsArbitraryLoads: true` to allow HTTP connections.
This is required for the iOS Simulator to reach the local Django server.

#### Riverpod Provider Map
| Provider | Type | Location | Purpose |
|----------|------|----------|---------|
| `authProvider` | `NotifierProvider` | `providers/auth_provider.dart` | Login, logout, session restore |
| `routeProvider` | `NotifierProvider` | `providers/route_provider.dart` | Route request, complete, state |
| `predictionsProvider` | `FutureProvider.autoDispose` | `providers/predictions_provider.dart` | Zone predictions sorted by risk |
| `heatmapProvider` | `FutureProvider.autoDispose` | `providers/predictions_provider.dart` | All zones for map circles |
| `reportProvider` | `NotifierProvider` | `providers/report_provider.dart` | Report form state + GPS capture |
| `summaryProvider` | `FutureProvider.autoDispose` | `providers/summary_provider.dart` | Dashboard summary stats |
| `historyProvider` | `FutureProvider.autoDispose` | `providers/history_provider.dart` | Past field reports |
| `routePolylineProvider` | `FutureProvider.autoDispose` | `providers/route_polyline_provider.dart` | OSRM road route polyline |

---

## Prediction Algorithm
```
event_waste_kg = (event_coeff × attendees / 100) × (duration / 6) × weather_mult × day_mult

Risk thresholds (above baseline):
  critical > 180 kg
  high     > 120 kg
  medium   >  80 kg
  low      ≤  80 kg
```

Event coefficients: food_festival=18.5, concert=9.2, night_market=14.2, marathon=4.1, ...
Weather multipliers: sunny=1.0, cloudy=1.05, rainy=1.15, storm=1.35
Day multipliers: weekday=1.0, weekend=1.25, holiday=1.45

---

## Smart Route Assignment
- `POST /api/routes/request/` — scores zones by risk+distance, assigns top 3 in nearest-neighbor order
- `PUT /api/routes/<id>/complete/` — marks done, applies cooldown (4h critical/high, 6h medium/low)
- Zones on cooldown and zones with active assignments are excluded from new requests

---

## Data Strategy
| Data | Source | Type |
|------|--------|------|
| TPS history (90 days × 30 zones) | Seed script | Synthetic |
| Indonesia public holidays | Nager.Date API (free, no key) | Real |
| Weather (current + 24h forecast) | Open-Meteo API (free, no key) | Real |
| Fleet GPS | Moving simulator in `gps_simulator.py` | Simulated |
| 30 Jakarta zone coordinates | Real Jakarta zone lat/lng | Real |
| Crowd permit events | Seed script (10 demo events) | Synthetic |

---

## Known Bugs Fixed

### 1. Route complete endpoint 500 error
**File:** `backend/api/views.py` — `route_complete` view
**Bug:** `assignment.stops.select_related('zone__predictions')` — `predictions` is a reverse FK, `select_related` can't follow it → `FieldError`
**Fix:** Changed to `select_related('zone').prefetch_related('zone__predictions')`

### 2. Empty route response caused crash on mobile
**File:** `mobile/lib/services/api_service.dart` — `getMyRoute`
**Bug:** `GET /api/routes/my/` returns 200 with empty body when no route assigned (DRF returns empty bytes for `Response(None)`). `jsonDecode('')` threw `FormatException` → app showed "Cannot connect" error.
**Fix:** Added `if (res.body.isEmpty) return null;` before `jsonDecode`

### 3. Swagger UI hung on load
**File:** `backend/wasteiq/settings.py`
**Bug:** `SpectacularSwaggerView` loads JS/CSS from CDN by default — hangs if internet is slow or CDN is blocked.
**Fix:** Set `SWAGGER_UI_DIST: 'SIDECAR'` + installed `drf-spectacular-sidecar` — all assets served locally.

### 4. iOS Simulator blocked HTTP (ATS)
**File:** `mobile/ios/Runner/Info.plist`
**Bug:** iOS App Transport Security blocks all HTTP by default. App appeared to "not connect" even though backend was running.
**Fix:** Added `NSAllowsArbitraryLoads: true` under `NSAppTransportSecurity`.

### 5. HTTP requests hung forever on wrong IP
**File:** `mobile/lib/services/api_service.dart`
**Bug:** No timeout on any HTTP request — when IP was wrong, loading spinner hung forever with no error.
**Fix:** Added `.timeout(Duration(seconds: 10))` to all `http.get/post/put` calls.

---

## Demo Flow (for judges)

1. **Backend** — `python3 manage.py runserver 0.0.0.0:8000`
2. **React Dashboard** — open http://localhost:5173
   - Dashboard: live weather widget, risk summary cards
   - Map: colored zone circles (Leaflet + OpenStreetMap)
   - Predictions: filter by zone/risk, generate new prediction
   - Fleet: live GPS truck positions (refresh to see movement)
   - Simulator: input event → instant waste prediction with risk badge
   - Calendar: events calendar with predicted waste totals per day
3. **Admin Panel** — open http://localhost:8000/admin/ (admin / admin1234)
   - Create/edit zones, drivers, events
   - Monitor route assignments and field reports
4. **Flutter App** — `flutter run` on simulator
   - Login with DLH-2001
   - Route List: tap "Get Route" → see assigned zone with risk + waste estimate
   - Map: OpenStreetMap with risk circles + road route polyline + location marker
   - Complete Route: tap "Complete Route" → confirm → cooldown applied
   - File Report: select type, describe, capture GPS, submit → success screen

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/api/prediction.py` | Core prediction algorithm |
| `backend/api/weather.py` | Open-Meteo integration |
| `backend/api/gps_simulator.py` | Fleet GPS simulation |
| `backend/api/views.py` | All 21 API endpoints |
| `backend/api/admin.py` | Django admin — all 9 models |
| `backend/api/management/commands/seed_data.py` | Full data seeder |
| `backend/wasteiq/settings.py` | Dual DB config (SQLite/PostgreSQL) |
| `frontend/src/services/api.js` | Axios API client |
| `mobile/lib/services/api_service.dart` | Flutter HTTP client (set baseUrl here) |
| `mobile/lib/services/session.dart` | Login session + route state persistence |
| `mobile/lib/providers/auth_provider.dart` | Auth state (Riverpod) |
| `mobile/lib/providers/route_provider.dart` | Route request/complete logic |
| `mobile/ios/Runner/Info.plist` | iOS permissions + ATS HTTP config |
