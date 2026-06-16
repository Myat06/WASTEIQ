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
python3 manage.py runserver
# → http://localhost:8000/api/
```

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
flutter run          # needs Android emulator or device
```

---

## Architecture

### Backend — `wasteiq/backend/`
- **Django 5.x + DRF** — 16 REST API endpoints
- **`api/prediction.py`** — coefficient-based prediction engine (no ML model)
- **`api/weather.py`** — Open-Meteo free API (Jakarta: -6.2, 106.8), no key needed
- **`api/gps_simulator.py`** — `tick_fleet()` moves trucks ~90m per API call
- **`api/management/commands/seed_data.py`** — seeds 30 zones, 15 drivers, 15 trucks, 10 events, 2700 TPS records, 720 predictions

### Frontend — `wasteiq/frontend/`
- **React.js + Vite + Chart.js + Leaflet.js**
- 9 pages: Dashboard, Map, Predictions, Simulator, Fleet, Drivers, Reports, Data, Performance
- All API calls via `src/services/api.js` (axios, baseURL: http://localhost:8000/api)

### Mobile — `wasteiq/mobile/`
- **Flutter 3.x + Riverpod 2.x**
- **State management**: `flutter_riverpod` — all async data through providers
- **4 screens**: Login → RouteList → Map → Report
- **Base URL**: `http://10.0.2.2:8000/api` (Android emulator) — change in `lib/services/api_service.dart` for real device

#### Riverpod Provider Map
| Provider | Type | Location | Purpose |
|----------|------|----------|---------|
| `authProvider` | `NotifierProvider` | `providers/auth_provider.dart` | Login, logout, session restore |
| `predictionsProvider` | `FutureProvider.autoDispose` | `providers/predictions_provider.dart` | Zone predictions sorted by risk |
| `heatmapProvider` | `FutureProvider.autoDispose` | `providers/predictions_provider.dart` | All zones for map circles |
| `reportProvider` | `NotifierProvider` | `providers/report_provider.dart` | Report form state + GPS capture |
| `summaryProvider` | `FutureProvider.autoDispose` | `providers/summary_provider.dart` | Dashboard summary stats |

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

## Demo Flow (for judges)

1. **Backend** — `python3 manage.py runserver` → show terminal with seed data loaded
2. **React Dashboard** — open http://localhost:5173
   - Dashboard: live weather widget, risk summary cards
   - Map: colored zone circles (Leaflet + OpenStreetMap)
   - Predictions: filter by zone/risk, generate new prediction
   - Fleet: live GPS truck positions (refresh to see movement)
   - Simulator: input event → instant waste prediction with risk badge
3. **Flutter App** — `flutter run` on emulator
   - Login with DLH-2001
   - Route List: zone summary card (total kg, critical count), priority-sorted routes
   - Map: OpenStreetMap with risk circles + your location marker
   - File Report: select type, describe, capture GPS, submit → success screen

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/api/prediction.py` | Core prediction algorithm |
| `backend/api/weather.py` | Open-Meteo integration |
| `backend/api/gps_simulator.py` | Fleet GPS simulation |
| `backend/api/views.py` | All 16 API endpoints |
| `backend/api/management/commands/seed_data.py` | Full data seeder |
| `frontend/src/services/api.js` | Axios API client |
| `mobile/lib/providers/auth_provider.dart` | Auth state (Riverpod) |
| `mobile/lib/providers/predictions_provider.dart` | Data providers (Riverpod) |
| `mobile/lib/services/api_service.dart` | Flutter HTTP client |
