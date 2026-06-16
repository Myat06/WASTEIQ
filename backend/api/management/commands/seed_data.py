"""
Seed command: loads 30 Jakarta zones, 15 fleet vehicles, 15 drivers,
10 demo events, 24h predictions for today, and 90 days of historical TPS records.
Indonesia public holidays fetched from Nager.Date API (free, no key).
"""
import random
import requests
from datetime import date, datetime, timedelta, time
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Zone, EventPermit, FleetVehicle, Driver, TPSRecord, Prediction, RouteAssignment
from api.prediction import predict_waste, predict_baseline
from api.weather import get_current_weather


JAKARTA_ZONES = [
    # Central Jakarta
    {"name": "Monas", "kelurahan": "Gambir", "kecamatan": "Gambir", "municipality": "Central", "land_use": "Commercial", "lat": -6.1754, "lng": 106.8272, "baseline_kg": 1800, "area": 0.72, "population": 8500},
    {"name": "Kota Tua", "kelurahan": "Pinangsia", "kecamatan": "Taman Sari", "municipality": "Central", "land_use": "Commercial", "lat": -6.1352, "lng": 106.8133, "baseline_kg": 1200, "area": 0.45, "population": 5200},
    {"name": "Pasar Baru", "kelurahan": "Pasar Baru", "kecamatan": "Sawah Besar", "municipality": "Central", "land_use": "Commercial", "lat": -6.1613, "lng": 106.8317, "baseline_kg": 2100, "area": 0.68, "population": 12000},
    {"name": "Menteng", "kelurahan": "Menteng", "kecamatan": "Menteng", "municipality": "Central", "land_use": "Residential", "lat": -6.1968, "lng": 106.8317, "baseline_kg": 950, "area": 0.65, "population": 22000},
    {"name": "Tanah Abang", "kelurahan": "Kebon Kacang", "kecamatan": "Tanah Abang", "municipality": "Central", "land_use": "Commercial", "lat": -6.1855, "lng": 106.8136, "baseline_kg": 3200, "area": 0.82, "population": 45000},
    {"name": "Senen", "kelurahan": "Senen", "kecamatan": "Senen", "municipality": "Central", "land_use": "Commercial", "lat": -6.1765, "lng": 106.8450, "baseline_kg": 2300, "area": 0.72, "population": 34000},
    {"name": "Cikini", "kelurahan": "Cikini", "kecamatan": "Menteng", "municipality": "Central", "land_use": "Commercial", "lat": -6.1950, "lng": 106.8402, "baseline_kg": 1100, "area": 0.40, "population": 16000},
    # South Jakarta
    {"name": "Kemang", "kelurahan": "Bangka", "kecamatan": "Mampang Prapatan", "municipality": "South", "land_use": "Commercial", "lat": -6.2603, "lng": 106.8126, "baseline_kg": 1500, "area": 0.55, "population": 18000},
    {"name": "Blok M", "kelurahan": "Melawai", "kecamatan": "Kebayoran Baru", "municipality": "South", "land_use": "Commercial", "lat": -6.2441, "lng": 106.7996, "baseline_kg": 2200, "area": 0.71, "population": 28000},
    {"name": "Senayan", "kelurahan": "Gelora", "kecamatan": "Tanah Abang", "municipality": "South", "land_use": "Commercial", "lat": -6.2183, "lng": 106.8023, "baseline_kg": 1800, "area": 0.90, "population": 9500},
    {"name": "Cipete", "kelurahan": "Cipete Utara", "kecamatan": "Kebayoran Baru", "municipality": "South", "land_use": "Residential", "lat": -6.2712, "lng": 106.7982, "baseline_kg": 820, "area": 0.48, "population": 24000},
    {"name": "Kebagusan", "kelurahan": "Kebagusan", "kecamatan": "Pasar Minggu", "municipality": "South", "land_use": "Residential", "lat": -6.3218, "lng": 106.8283, "baseline_kg": 680, "area": 0.52, "population": 19000},
    {"name": "Sudirman-SCBD", "kelurahan": "Senayan", "kecamatan": "Kebayoran Baru", "municipality": "South", "land_use": "Commercial", "lat": -6.2245, "lng": 106.8084, "baseline_kg": 2800, "area": 0.95, "population": 8000},
    {"name": "Kuningan", "kelurahan": "Kuningan Timur", "kecamatan": "Setiabudi", "municipality": "South", "land_use": "Commercial", "lat": -6.2295, "lng": 106.8310, "baseline_kg": 1600, "area": 0.70, "population": 11000},
    {"name": "Tebet", "kelurahan": "Tebet Barat", "kecamatan": "Tebet", "municipality": "South", "land_use": "Residential", "lat": -6.2410, "lng": 106.8510, "baseline_kg": 990, "area": 0.58, "population": 27000},
    # North Jakarta
    {"name": "Ancol", "kelurahan": "Ancol", "kecamatan": "Pademangan", "municipality": "North", "land_use": "Commercial", "lat": -6.1228, "lng": 106.8451, "baseline_kg": 2500, "area": 1.20, "population": 6800},
    {"name": "Penjaringan", "kelurahan": "Penjaringan", "kecamatan": "Penjaringan", "municipality": "North", "land_use": "Industrial", "lat": -6.1171, "lng": 106.7892, "baseline_kg": 3100, "area": 1.55, "population": 32000},
    {"name": "Pluit", "kelurahan": "Pluit", "kecamatan": "Penjaringan", "municipality": "North", "land_use": "Residential", "lat": -6.1109, "lng": 106.7957, "baseline_kg": 890, "area": 0.68, "population": 28000},
    {"name": "Muara Baru", "kelurahan": "Penjaringan", "kecamatan": "Penjaringan", "municipality": "North", "land_use": "Coastal", "lat": -6.1082, "lng": 106.7955, "baseline_kg": 1400, "area": 0.42, "population": 12000},
    {"name": "Tanjung Priok", "kelurahan": "Tanjung Priok", "kecamatan": "Tanjung Priok", "municipality": "North", "land_use": "Industrial", "lat": -6.1087, "lng": 106.8762, "baseline_kg": 2800, "area": 1.80, "population": 41000},
    # East Jakarta
    {"name": "Rawamangun", "kelurahan": "Rawamangun", "kecamatan": "Pulogadung", "municipality": "East", "land_use": "Residential", "lat": -6.1963, "lng": 106.8874, "baseline_kg": 1100, "area": 0.62, "population": 35000},
    {"name": "Cawang", "kelurahan": "Cawang", "kecamatan": "Kramat Jati", "municipality": "East", "land_use": "Commercial", "lat": -6.2427, "lng": 106.8703, "baseline_kg": 1600, "area": 0.75, "population": 22000},
    {"name": "Jatinegara", "kelurahan": "Rawa Bunga", "kecamatan": "Jatinegara", "municipality": "East", "land_use": "Commercial", "lat": -6.2157, "lng": 106.8708, "baseline_kg": 2400, "area": 0.85, "population": 38000},
    {"name": "Pasar Minggu", "kelurahan": "Pasar Minggu", "kecamatan": "Pasar Minggu", "municipality": "East", "land_use": "Commercial", "lat": -6.2897, "lng": 106.8445, "baseline_kg": 1900, "area": 0.78, "population": 29000},
    {"name": "Duren Sawit", "kelurahan": "Duren Sawit", "kecamatan": "Duren Sawit", "municipality": "East", "land_use": "Residential", "lat": -6.2285, "lng": 106.9087, "baseline_kg": 780, "area": 0.59, "population": 26000},
    # West Jakarta
    {"name": "Grogol", "kelurahan": "Grogol", "kecamatan": "Grogol Petamburan", "municipality": "West", "land_use": "Residential", "lat": -6.1676, "lng": 106.7894, "baseline_kg": 1050, "area": 0.60, "population": 31000},
    {"name": "Taman Anggrek", "kelurahan": "Tanjung Duren Utara", "kecamatan": "Grogol Petamburan", "municipality": "West", "land_use": "Commercial", "lat": -6.1781, "lng": 106.7929, "baseline_kg": 1700, "area": 0.40, "population": 15000},
    {"name": "Puri Indah", "kelurahan": "Kembangan Utara", "kecamatan": "Kembangan", "municipality": "West", "land_use": "Residential", "lat": -6.1923, "lng": 106.7425, "baseline_kg": 720, "area": 0.55, "population": 20000},
    {"name": "Kalideres", "kelurahan": "Kalideres", "kecamatan": "Kalideres", "municipality": "West", "land_use": "Industrial", "lat": -6.1482, "lng": 106.7018, "baseline_kg": 2600, "area": 1.20, "population": 44000},
    {"name": "Cengkareng", "kelurahan": "Cengkareng Timur", "kecamatan": "Cengkareng", "municipality": "West", "land_use": "Residential", "lat": -6.1512, "lng": 106.7334, "baseline_kg": 1350, "area": 0.85, "population": 52000},
]

DEMO_EVENTS = [
    {"name": "Jakarta Food Festival 2026", "type": "food_festival", "zone": "Kemang", "attendees": 20000, "duration": 8, "hour": 10, "offset_days": 0},
    {"name": "Konser Dewa 19 Reunion", "type": "concert", "zone": "Senayan", "attendees": 55000, "duration": 4, "hour": 19, "offset_days": 1},
    {"name": "Jakarta Marathon 2026", "type": "marathon", "zone": "Monas", "attendees": 12000, "duration": 6, "hour": 5, "offset_days": 2},
    {"name": "Pasar Malam Kota Tua", "type": "night_market", "zone": "Kota Tua", "attendees": 8000, "duration": 5, "hour": 17, "offset_days": 0},
    {"name": "Tech Innovation Exhibition", "type": "exhibition", "zone": "Sudirman-SCBD", "attendees": 6000, "duration": 9, "hour": 9, "offset_days": 3},
    {"name": "Pasar Ramadan Tanah Abang", "type": "street_market", "zone": "Tanah Abang", "attendees": 35000, "duration": 12, "hour": 8, "offset_days": 1},
    {"name": "Persija vs Arema FC", "type": "sports_match", "zone": "Senayan", "attendees": 42000, "duration": 3, "hour": 15, "offset_days": 4},
    {"name": "Tabligh Akbar Jakarta", "type": "religious_gathering", "zone": "Monas", "attendees": 80000, "duration": 5, "hour": 8, "offset_days": 5},
    {"name": "Arak-arakan HUT Jakarta", "type": "other", "zone": "Ancol", "attendees": 15000, "duration": 6, "hour": 10, "offset_days": 6},
    {"name": "Blok M Night Festival", "type": "night_market", "zone": "Blok M", "attendees": 9000, "duration": 6, "hour": 18, "offset_days": 2},
]

# 10 drivers: 2 per Jakarta municipality, each with a distinct starting GPS position
DRIVERS = [
    # Central Jakarta
    {"name": "Budi Santoso",    "employee_id": "DLH-2001", "phone": "+62 812-3401-7821", "municipality": "Central", "lat": -6.1740, "lng": 106.8260},
    {"name": "Agus Prasetyo",   "employee_id": "DLH-2002", "phone": "+62 812-3402-6543", "municipality": "Central", "lat": -6.1780, "lng": 106.8430},
    # South Jakarta
    {"name": "Hendra Wijaya",   "employee_id": "DLH-2003", "phone": "+62 812-3403-9812", "municipality": "South",   "lat": -6.2590, "lng": 106.8110},
    {"name": "Dedi Kurniawan",  "employee_id": "DLH-2004", "phone": "+62 812-3404-5567", "municipality": "South",   "lat": -6.2430, "lng": 106.8010},
    # North Jakarta
    {"name": "Rudi Hartono",    "employee_id": "DLH-2005", "phone": "+62 812-3405-3341", "municipality": "North",   "lat": -6.1240, "lng": 106.8440},
    {"name": "Slamet Riyadi",   "employee_id": "DLH-2006", "phone": "+62 812-3406-7892", "municipality": "North",   "lat": -6.1100, "lng": 106.8750},
    # East Jakarta
    {"name": "Wahyu Nugroho",   "employee_id": "DLH-2007", "phone": "+62 812-3407-2234", "municipality": "East",    "lat": -6.1950, "lng": 106.8860},
    {"name": "Eko Susanto",     "employee_id": "DLH-2008", "phone": "+62 812-3408-8801", "municipality": "East",    "lat": -6.2170, "lng": 106.8720},
    # West Jakarta
    {"name": "Bambang Suryadi", "employee_id": "DLH-2009", "phone": "+62 812-3409-4412", "municipality": "West",   "lat": -6.1680, "lng": 106.7880},
    {"name": "Fauzi Arifin",    "employee_id": "DLH-2010", "phone": "+62 812-3410-6654", "municipality": "West",   "lat": -6.1490, "lng": 106.7030},
]

VEHICLE_TYPES = ['compactor', 'organic_hauler', 'recycling_unit', 'tipper']
VEHICLE_CAPACITIES = {'compactor': 3000, 'organic_hauler': 2500, 'recycling_unit': 2000, 'tipper': 4000}


def _get_indonesia_holidays(year):
    """Fetch Indonesian public holidays from Nager.Date (free API)."""
    try:
        resp = requests.get(f"https://date.nager.at/api/v3/PublicHolidays/{year}/ID", timeout=5)
        if resp.status_code == 200:
            return {item['date'] for item in resp.json()}
    except Exception:
        pass
    # Fallback: hardcoded major 2026 holidays
    return {
        '2026-01-01', '2026-03-31', '2026-04-02', '2026-04-03',
        '2026-05-01', '2026-05-14', '2026-06-01', '2026-08-17',
        '2026-12-25',
    }


def _day_type(d, holidays):
    if d.isoformat() in holidays:
        return 'holiday'
    if d.weekday() >= 5:
        return 'weekend'
    return 'weekday'


def _fake_weather():
    return random.choices(
        ['sunny', 'cloudy', 'rainy', 'storm'],
        weights=[50, 25, 20, 5]
    )[0]


class Command(BaseCommand):
    help = 'Seed WasteIQ with 30 zones, fleet, drivers, events, TPS history, and today predictions'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        RouteAssignment.objects.all().delete()
        Prediction.objects.all().delete()
        TPSRecord.objects.all().delete()
        Driver.objects.all().delete()
        FleetVehicle.objects.all().delete()
        EventPermit.objects.all().delete()
        Zone.objects.all().delete()

        # ── 1. Zones ──────────────────────────────────────────────────────────
        self.stdout.write('Seeding 30 zones...')
        zones = {}
        for z in JAKARTA_ZONES:
            zone = Zone.objects.create(
                name=z['name'],
                kelurahan=z['kelurahan'],
                kecamatan=z['kecamatan'],
                municipality=z['municipality'],
                land_use=z['land_use'],
                latitude=z['lat'],
                longitude=z['lng'],
                baseline_waste_kg_per_day=z['baseline_kg'],
                area_sqkm=z['area'],
                population=z['population'],
            )
            zones[z['name']] = zone
        self.stdout.write(self.style.SUCCESS(f'  Created {len(zones)} zones'))

        # ── 2. Fleet vehicles — 1 per driver, parked at driver's starting location ──
        self.stdout.write('Seeding 10 fleet vehicles...')
        zone_list = list(zones.values())
        vehicles = []
        for i, d in enumerate(DRIVERS):
            vtype = VEHICLE_TYPES[i % len(VEHICLE_TYPES)]
            nearest_zone = min(zone_list, key=lambda z: (z.latitude - d['lat'])**2 + (z.longitude - d['lng'])**2)
            v = FleetVehicle.objects.create(
                vehicle_id=f"TRK-{i+1:03d}",
                vehicle_type=vtype,
                capacity_kg=VEHICLE_CAPACITIES[vtype],
                status='idle',
                current_zone=nearest_zone,
                current_latitude=d['lat'],
                current_longitude=d['lng'],
                target_latitude=nearest_zone.latitude,
                target_longitude=nearest_zone.longitude,
                capacity_pct=random.randint(0, 30),
            )
            vehicles.append(v)
        self.stdout.write(self.style.SUCCESS('  Created 10 vehicles'))

        # ── 3. Drivers — 10 real drivers spread across Jakarta municipalities ──
        self.stdout.write('Seeding 10 drivers...')
        for i, d in enumerate(DRIVERS):
            nearest_zone = min(zone_list, key=lambda z: (z.latitude - d['lat'])**2 + (z.longitude - d['lng'])**2)
            Driver.objects.create(
                name=d['name'],
                employee_id=d['employee_id'],
                phone=d['phone'],
                assigned_vehicle=vehicles[i],
                assigned_zone=nearest_zone,
                is_on_duty=True,
            )
        self.stdout.write(self.style.SUCCESS('  Created 10 drivers'))

        # ── 4. Indonesia holidays ─────────────────────────────────────────────
        self.stdout.write('Fetching Indonesia public holidays...')
        today = date.today()
        holidays = _get_indonesia_holidays(today.year)
        holidays |= _get_indonesia_holidays(today.year - 1)
        self.stdout.write(self.style.SUCCESS(f'  Got {len(holidays)} holiday dates'))

        # ── 5. Demo events ────────────────────────────────────────────────────
        self.stdout.write('Seeding 10 demo events...')
        for i, ev in enumerate(DEMO_EVENTS):
            zone = zones.get(ev['zone'])
            if not zone:
                continue
            event_date = today + timedelta(days=ev['offset_days'])
            EventPermit.objects.create(
                permit_number=f"EVT-2026-{i+1:04d}",
                event_name=ev['name'],
                event_type=ev['type'],
                zone=zone,
                expected_attendees=ev['attendees'],
                event_date=event_date,
                start_time=time(ev['hour'], 0),
                duration_hours=ev['duration'],
                organizer_name=f"Organizer {i+1} Jakarta",
                status='approved',
            )
        self.stdout.write(self.style.SUCCESS('  Created 10 events'))

        # ── 6. Historical TPS records (90 days) ───────────────────────────────
        self.stdout.write('Generating 90 days of TPS history...')
        waste_types = ['organic', 'plastic', 'paper', 'mixed']
        tps_bulk = []
        for zone in zone_list:
            for day_offset in range(90):
                d = today - timedelta(days=day_offset + 1)
                dt = _day_type(d, holidays)
                weather = _fake_weather()
                # Apply multipliers to baseline
                day_mult = {'weekday': 1.0, 'weekend': 1.25, 'holiday': 1.45}[dt]
                wx_mult = {'sunny': 1.0, 'cloudy': 1.05, 'rainy': 1.15, 'storm': 1.35}[weather]
                base_tons = zone.baseline_waste_kg_per_day / 1000
                actual = base_tons * day_mult * wx_mult * random.uniform(0.88, 1.12)
                tps_bulk.append(TPSRecord(
                    zone=zone,
                    recorded_at=timezone.make_aware(datetime(d.year, d.month, d.day, 14, 0)),
                    waste_tons=round(actual, 3),
                    waste_type=random.choice(waste_types),
                    collection_vehicle_id=random.choice(vehicles).vehicle_id if vehicles else '',
                ))
        TPSRecord.objects.bulk_create(tps_bulk, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(tps_bulk)} TPS records'))

        # ── 7. Today's 24h predictions for all zones ──────────────────────────
        self.stdout.write('Generating today predictions (24h × 30 zones)...')
        weather_now = get_current_weather()['condition']
        dt_today = _day_type(today, holidays)
        today_events = {e.zone_id: e for e in EventPermit.objects.filter(event_date=today, status='approved')}
        pred_bulk = []
        for zone in zone_list:
            event = today_events.get(zone.id)
            for hour in range(24):
                hour_weather = weather_now if hour >= 6 else 'sunny'
                if event and event.start_time.hour <= hour < event.start_time.hour + int(event.duration_hours):
                    r = predict_waste(
                        event.event_type, event.expected_attendees,
                        event.duration_hours, hour_weather, dt_today,
                        zone.baseline_waste_kg_per_day,
                    )
                    ev_ref = event
                else:
                    r = predict_baseline(zone.baseline_waste_kg_per_day, hour_weather, dt_today)
                    ev_ref = None

                pred_bulk.append(Prediction(
                    zone=zone,
                    event=ev_ref,
                    prediction_date=today,
                    prediction_hour=hour,
                    total_waste_kg=r['total_waste_kg'],
                    event_waste_kg=r['event_waste_kg'],
                    risk_level=r['risk_level'],
                    workers_needed=r['workers_needed'],
                    man_hours_required=r['man_hours_required'],
                    trucks_needed=r['trucks_needed'],
                    temp_bins_needed=r['temp_bins_needed'],
                    temp_tps_units_needed=r['temp_tps_units_needed'],
                    confidence_lower=r['confidence_interval']['lower'],
                    confidence_upper=r['confidence_interval']['upper'],
                    weather_condition=hour_weather,
                    day_type=dt_today,
                ))
        Prediction.objects.bulk_create(pred_bulk, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(pred_bulk)} predictions'))

        self.stdout.write(self.style.SUCCESS('\nWasteIQ seed complete!'))
        self.stdout.write('Run: python manage.py runserver')
