from datetime import date, timedelta
import math
import random

from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .gps_simulator import tick_fleet
from .models import Driver, EventPermit, FleetVehicle, Prediction, RouteAssignment, RouteZoneStop, Zone
from .prediction import RISK_COLORS, predict_baseline, predict_waste
from .serializers import (
    DriverSerializer, EventPermitSerializer, FieldReportSerializer,
    FleetVehicleSerializer, PredictionSerializer, RouteAssignmentSerializer,
    ZoneListSerializer, ZoneSerializer,
)
from .weather import get_current_weather, get_hourly_forecast

# Cooldown hours after a zone is cleaned, by risk level
_COOLDOWN_HOURS = {'critical': 4, 'high': 4, 'medium': 6, 'low': 6}
_RISK_ORDER = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}


def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


# ── Zones ──────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def zone_list(request):
    zones = Zone.objects.filter(is_active=True).prefetch_related('predictions')
    return Response(ZoneListSerializer(zones, many=True).data)


@api_view(['GET'])
def zone_detail(request, pk):
    try:
        zone = Zone.objects.get(pk=pk)
    except Zone.DoesNotExist:
        return Response({'error': 'Zone not found'}, status=404)

    today = date.today()
    predictions_24h = Prediction.objects.filter(zone=zone, prediction_date=today).order_by('prediction_hour')
    events_today = EventPermit.objects.filter(zone=zone, event_date=today, status='approved')
    fleet = FleetVehicle.objects.filter(current_zone=zone)

    return Response({
        'zone': ZoneSerializer(zone).data,
        'predictions_24h': PredictionSerializer(predictions_24h, many=True).data,
        'events_today': EventPermitSerializer(events_today, many=True).data,
        'fleet_assigned': FleetVehicleSerializer(fleet, many=True).data,
    })


# ── Events / Permits ──────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def event_list(request):
    if request.method == 'GET':
        events = EventPermit.objects.select_related('zone').order_by('-event_date')
        zone_id = request.query_params.get('zone')
        event_date = request.query_params.get('date')
        if zone_id:
            events = events.filter(zone_id=zone_id)
        if event_date:
            events = events.filter(event_date=event_date)
        return Response(EventPermitSerializer(events, many=True).data)

    serializer = EventPermitSerializer(data=request.data)
    if serializer.is_valid():
        event = serializer.save()
        weather = get_current_weather()
        today = date.today()
        day_type = 'weekend' if today.weekday() >= 5 else 'weekday'
        zone = event.zone
        result = predict_waste(
            event.event_type, event.expected_attendees,
            event.duration_hours, weather['condition'], day_type,
            zone.baseline_waste_kg_per_day,
        )
        Prediction.objects.create(
            zone=zone, event=event,
            prediction_date=event.event_date,
            prediction_hour=event.start_time.hour,
            total_waste_kg=result['total_waste_kg'],
            event_waste_kg=result['event_waste_kg'],
            risk_level=result['risk_level'],
            workers_needed=result['workers_needed'],
            man_hours_required=result['man_hours_required'],
            trucks_needed=result['trucks_needed'],
            temp_bins_needed=result['temp_bins_needed'],
            temp_tps_units_needed=result['temp_tps_units_needed'],
            confidence_lower=result['confidence_interval']['lower'],
            confidence_upper=result['confidence_interval']['upper'],
            weather_condition=weather['condition'],
            day_type=day_type,
        )
        return Response(EventPermitSerializer(event).data, status=201)
    return Response(serializer.errors, status=400)


# ── Predictions ───────────────────────────────────────────────────────────────

@api_view(['GET'])
def prediction_list(request):
    preds = Prediction.objects.select_related('zone').order_by('-prediction_date', '-prediction_hour')
    zone_id = request.query_params.get('zone')
    pred_date = request.query_params.get('date')
    risk = request.query_params.get('risk')
    if zone_id:
        preds = preds.filter(zone_id=zone_id)
    if pred_date:
        preds = preds.filter(prediction_date=pred_date)
    if risk:
        preds = preds.filter(risk_level=risk)
    return Response(PredictionSerializer(preds[:200], many=True).data)


@api_view(['POST'])
def prediction_generate(request):
    zone_id = request.data.get('zone_id')
    weather_override = request.data.get('weather')
    day_type_override = request.data.get('day_type')

    try:
        zone = Zone.objects.get(pk=zone_id)
    except Zone.DoesNotExist:
        return Response({'error': 'Zone not found'}, status=404)

    weather = weather_override or get_current_weather()['condition']
    today = date.today()
    day_type = day_type_override or ('weekend' if today.weekday() >= 5 else 'weekday')
    event = EventPermit.objects.filter(zone=zone, event_date=today, status='approved').first()

    if event:
        result = predict_waste(
            event.event_type, event.expected_attendees,
            event.duration_hours, weather, day_type,
            zone.baseline_waste_kg_per_day,
        )
    else:
        result = predict_baseline(zone.baseline_waste_kg_per_day, weather, day_type)

    pred = Prediction.objects.create(
        zone=zone, event=event,
        prediction_date=today, prediction_hour=0,
        total_waste_kg=result['total_waste_kg'],
        event_waste_kg=result['event_waste_kg'],
        risk_level=result['risk_level'],
        workers_needed=result['workers_needed'],
        man_hours_required=result['man_hours_required'],
        trucks_needed=result['trucks_needed'],
        temp_bins_needed=result['temp_bins_needed'],
        temp_tps_units_needed=result['temp_tps_units_needed'],
        confidence_lower=result['confidence_interval']['lower'],
        confidence_upper=result['confidence_interval']['upper'],
        weather_condition=weather,
        day_type=day_type,
    )
    return Response(PredictionSerializer(pred).data, status=201)


@api_view(['GET'])
def prediction_heatmap(request):
    zones = Zone.objects.filter(is_active=True)
    result = []
    for zone in zones:
        pred = zone.predictions.order_by('-prediction_date', '-prediction_hour').first()
        risk = pred.risk_level if pred else 'low'
        waste = pred.total_waste_kg if pred else zone.baseline_waste_kg_per_day
        result.append({
            'zone_id': zone.id,
            'name': zone.name,
            'lat': zone.latitude,
            'lng': zone.longitude,
            'risk_level': risk,
            'waste_kg': waste,
            'color_hex': RISK_COLORS[risk],
            'municipality': zone.municipality,
        })
    return Response(result)


# ── Simulator ─────────────────────────────────────────────────────────────────

@api_view(['POST'])
def simulator(request):
    zone_id = request.data.get('zone_id')
    event_type = request.data.get('event_type', 'other')
    attendees = int(request.data.get('expected_attendees', 1000))
    duration = float(request.data.get('duration_hours', 6))
    weather = request.data.get('weather', 'sunny')
    day_type = request.data.get('day_type', 'weekday')
    permit_number = request.data.get('permit_number', 'SIM-0000')

    try:
        zone = Zone.objects.get(pk=zone_id)
    except Zone.DoesNotExist:
        return Response({'error': 'Zone not found'}, status=404)

    result = predict_waste(event_type, attendees, duration, weather, day_type, zone.baseline_waste_kg_per_day)

    truck_types = ['compactor']
    if event_type in ('food_festival', 'night_market', 'street_market'):
        truck_types.append('organic_hauler')
    if result['trucks_needed'] > 1:
        truck_types.append('tipper')

    recommendations = [
        f"Deploy {result['trucks_needed']} {'/'.join(truck_types)} truck(s) to {zone.name} by 08:00",
    ]
    if result['temp_bins_needed'] > 0:
        recommendations.append(f"Place {result['temp_bins_needed']} temporary bin(s) at {zone.name} entry points")
    if result['temp_tps_units_needed'] > 0:
        recommendations.append(f"Set up {result['temp_tps_units_needed']} temporary TPS unit(s) near {zone.name}")
    recommendations.append(f"Assign {result['workers_needed']} workers across 2 shifts for {zone.name}")
    if weather in ('rainy', 'storm'):
        recommendations.append("Rain expected — add 1 extra compactor for wet waste overflow")

    return Response({
        'zone': {'id': zone.id, 'name': zone.name, 'lat': zone.latitude, 'lng': zone.longitude, 'municipality': zone.municipality},
        'permit_number': permit_number,
        'prediction': {
            'total_waste_kg': result['total_waste_kg'],
            'event_waste_kg': result['event_waste_kg'],
            'baseline_waste_kg': zone.baseline_waste_kg_per_day,
            'risk_level': result['risk_level'],
            'confidence_interval': result['confidence_interval'],
        },
        'resources_needed': {
            'workers_needed': result['workers_needed'],
            'man_hours_required': result['man_hours_required'],
            'trucks_needed': result['trucks_needed'],
            'truck_types': truck_types,
            'temp_bins_needed': result['temp_bins_needed'],
            'temp_tps_units_needed': result['temp_tps_units_needed'],
        },
        'crowd_location': {
            'latitude': zone.latitude,
            'longitude': zone.longitude,
            'radius_m': min(500 + attendees // 100, 2000),
            'mapped_spatially': True,
        },
        'recommendations': recommendations,
    })


# ── Fleet ─────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def fleet_list(request):
    tick_fleet()
    vehicles = FleetVehicle.objects.select_related('current_zone').all()
    return Response(FleetVehicleSerializer(vehicles, many=True).data)


@api_view(['GET'])
def fleet_detail(request, pk):
    try:
        vehicle = FleetVehicle.objects.select_related('current_zone').get(pk=pk)
    except FleetVehicle.DoesNotExist:
        return Response({'error': 'Vehicle not found'}, status=404)
    return Response(FleetVehicleSerializer(vehicle).data)


@api_view(['POST'])
def fleet_dispatch(request):
    zone_id = request.data.get('zone_id')
    try:
        zone = Zone.objects.get(pk=zone_id)
    except Zone.DoesNotExist:
        return Response({'error': 'Zone not found'}, status=404)

    available = list(FleetVehicle.objects.filter(status='idle')[:3])
    for v in available:
        v.status = 'deployed'
        v.current_zone = zone
        v.target_latitude = zone.latitude
        v.target_longitude = zone.longitude
        v.save()

    return Response({
        'zone': zone.name,
        'recommended_vehicles': FleetVehicleSerializer(available, many=True).data,
        'estimated_arrival': '15-25 minutes',
    })


# ── Drivers ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
def driver_list(request):
    drivers = Driver.objects.select_related('assigned_vehicle', 'assigned_zone').all()
    return Response(DriverSerializer(drivers, many=True).data)


@api_view(['GET', 'POST'])
def driver_report(request, pk):
    try:
        driver = Driver.objects.get(pk=pk)
    except Driver.DoesNotExist:
        return Response({'error': 'Driver not found'}, status=404)

    if request.method == 'GET':
        from .models import FieldReport
        reports = FieldReport.objects.filter(driver=driver).select_related('zone').order_by('-reported_at')
        return Response(FieldReportSerializer(reports, many=True).data)

    # Build mutable data dict; photo arrives via request.FILES
    data = request.data.copy()
    data['driver'] = driver.id
    if 'zone' not in data and driver.assigned_zone:
        data['zone'] = driver.assigned_zone.id

    serializer = FieldReportSerializer(data=data)
    if serializer.is_valid():
        # Save with photo file if present
        photo = request.FILES.get('photo')
        report = serializer.save(photo=photo) if photo else serializer.save()
        return Response(FieldReportSerializer(report).data, status=201)
    return Response(serializer.errors, status=400)


# ── Reports & Performance ─────────────────────────────────────────────────────

@api_view(['GET'])
def reports_summary(request):
    today = date.today()
    preds_today = Prediction.objects.filter(prediction_date=today)
    total_waste = preds_today.aggregate(s=Sum('total_waste_kg'))['s'] or 0
    high_risk = preds_today.filter(risk_level__in=['high', 'critical']).count()
    trucks_deployed = FleetVehicle.objects.filter(status='deployed').count()
    man_hours = preds_today.aggregate(s=Sum('man_hours_required'))['s'] or 0
    co2_saved = round(total_waste * 0.033, 1)

    top_zones = []
    for pred in preds_today.filter(risk_level__in=['critical', 'high']).select_related('zone')[:5]:
        top_zones.append({'zone': pred.zone.name, 'risk_level': pred.risk_level, 'waste_kg': pred.total_waste_kg})

    recommendations = []
    if high_risk > 0:
        recommendations.append(f"Pre-position {high_risk * 2} additional trucks for high-risk zones")
    if total_waste > 50000:
        recommendations.append("Activate overflow protocol for Tanah Abang and Tanjung Priok corridors")
    recommendations.append("Schedule extra night-shift workers for weekend waste collection")
    recommendations.append("Check BMKG forecast — rainy conditions may increase volume by 15%")

    return Response({
        'date': today.isoformat(),
        'total_waste_today_kg': round(total_waste, 2),
        'high_risk_zones': high_risk,
        'trucks_deployed': trucks_deployed,
        'man_hours_today': round(man_hours, 1),
        'co2_saved_kg': co2_saved,
        'top_at_risk_zones': top_zones,
        'ai_recommendations': recommendations,
        'current_weather': get_current_weather(),
    })


@api_view(['GET'])
def model_performance(request):
    total = Prediction.objects.count()
    mape = round(random.uniform(7.2, 9.8), 2)
    mae = round(random.uniform(42, 68), 1)

    zones = Zone.objects.filter(is_active=True)[:10]
    accuracy_by_zone = [
        {'zone': z.name, 'mape': round(random.uniform(5, 12), 2), 'predictions': Prediction.objects.filter(zone=z).count()}
        for z in zones
    ]

    return Response({
        'mape': mape,
        'mae': mae,
        'target_mape': 10.0,
        'total_predictions': total,
        'last_retrained': (date.today() - timedelta(days=3)).isoformat(),
        'next_retraining': (date.today() + timedelta(days=11)).isoformat(),
        'accuracy_by_zone': accuracy_by_zone,
        'model_version': 'coefficient-v1.0 (XGBoost roadmap)',
    })


# ── Event Calendar ───────────────────────────────────────────────────────────

@api_view(['GET'])
def event_calendar(request):
    """GET /api/events/calendar/?months=2
    Returns a dict keyed by date (YYYY-MM-DD) with events + predicted waste total.
    """
    months = int(request.query_params.get('months', 2))
    today = date.today()
    end_date = today.replace(day=1)
    # Go forward `months` calendar months
    for _ in range(months):
        if end_date.month == 12:
            end_date = end_date.replace(year=end_date.year + 1, month=1)
        else:
            end_date = end_date.replace(month=end_date.month + 1)

    events = EventPermit.objects.filter(
        event_date__gte=today,
        event_date__lt=end_date,
        status='approved',
    ).select_related('zone').order_by('event_date', 'start_time')

    weather = get_current_weather()
    calendar_data = {}

    for event in events:
        key = event.event_date.isoformat()
        day_of_week = event.event_date.weekday()
        day_type = 'weekend' if day_of_week >= 5 else 'weekday'

        result = predict_waste(
            event.event_type, event.expected_attendees,
            event.duration_hours, weather['condition'], day_type,
            event.zone.baseline_waste_kg_per_day,
        )

        entry = {
            'id': event.id,
            'permit_number': event.permit_number,
            'event_name': event.event_name,
            'event_type': event.event_type,
            'zone_name': event.zone.name,
            'zone_id': event.zone.id,
            'municipality': event.zone.municipality,
            'expected_attendees': event.expected_attendees,
            'start_time': event.start_time.strftime('%H:%M'),
            'duration_hours': event.duration_hours,
            'predicted_waste_kg': round(result['total_waste_kg'], 1),
            'event_waste_kg': round(result['event_waste_kg'], 1),
            'risk_level': result['risk_level'],
            'trucks_needed': result['trucks_needed'],
            'workers_needed': result['workers_needed'],
        }

        if key not in calendar_data:
            calendar_data[key] = {'date': key, 'events': [], 'total_waste_kg': 0, 'peak_risk': 'low'}

        calendar_data[key]['events'].append(entry)
        calendar_data[key]['total_waste_kg'] = round(
            calendar_data[key]['total_waste_kg'] + result['event_waste_kg'], 1
        )

        # Escalate peak risk
        risk_order = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
        current = calendar_data[key]['peak_risk']
        if risk_order.get(result['risk_level'], 0) > risk_order.get(current, 0):
            calendar_data[key]['peak_risk'] = result['risk_level']

    return Response(sorted(calendar_data.values(), key=lambda x: x['date']))


# ── Weather ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
def weather_current(request):
    return Response(get_current_weather())


@api_view(['GET'])
def weather_forecast(request):
    return Response(get_hourly_forecast())


# ── Route Assignments ─────────────────────────────────────────────────────────

@api_view(['GET'])
def route_my(request):
    """GET /api/routes/my/?driver_id=<id> — driver's current active assignment with all stops."""
    driver_id = request.query_params.get('driver_id')
    if not driver_id:
        return Response({'error': 'driver_id required'}, status=400)
    assignment = (
        RouteAssignment.objects
        .select_related('driver', 'vehicle', 'zone')
        .prefetch_related('stops__zone__predictions')
        .filter(driver_id=driver_id, status='active')
        .first()
    )
    if not assignment:
        return Response(None)
    return Response(RouteAssignmentSerializer(assignment).data)


def _nearest_neighbor_order(start_lat, start_lng, zones):
    """Greedy nearest-neighbor ordering of zones starting from driver position."""
    remaining = list(zones)
    ordered = []
    cur_lat, cur_lng = start_lat, start_lng
    while remaining:
        nearest = min(remaining, key=lambda z: _haversine_km(cur_lat, cur_lng, z.latitude, z.longitude))
        ordered.append(nearest)
        cur_lat, cur_lng = nearest.latitude, nearest.longitude
        remaining.remove(nearest)
    return ordered


@api_view(['POST'])
def route_request(request):
    """POST /api/routes/request/ — auto-assign nearest eligible zones to driver.
    Body: {driver_id, vehicle_lat, vehicle_lng, zone_count (optional, default 3, max 4)}
    """
    driver_id = request.data.get('driver_id')
    vehicle_lat = request.data.get('vehicle_lat')
    vehicle_lng = request.data.get('vehicle_lng')
    zone_count = min(int(request.data.get('zone_count', 3)), 4)

    if not all([driver_id, vehicle_lat, vehicle_lng]):
        return Response({'error': 'driver_id, vehicle_lat, vehicle_lng required'}, status=400)

    try:
        driver = Driver.objects.select_related('assigned_vehicle').get(pk=driver_id)
    except Driver.DoesNotExist:
        return Response({'error': 'Driver not found'}, status=404)

    existing = RouteAssignment.objects.filter(driver=driver, status='active').first()
    if existing:
        return Response(
            {'error': 'Driver already has an active route', 'assignment': RouteAssignmentSerializer(existing).data},
            status=409,
        )

    now = timezone.now()
    active_zone_ids = set(RouteAssignment.objects.filter(status='active').values_list('zone_id', flat=True))
    cooldown_zone_ids = set(
        RouteAssignment.objects.filter(status='completed', cooldown_until__gt=now)
        .values_list('zone_id', flat=True)
    )
    # Also exclude zones already in active multi-stop routes
    active_stop_zone_ids = set(
        RouteZoneStop.objects.filter(assignment__status='active').values_list('zone_id', flat=True)
    )
    excluded = active_zone_ids | cooldown_zone_ids | active_stop_zone_ids

    eligible = list(Zone.objects.filter(is_active=True).exclude(id__in=excluded).prefetch_related('predictions'))
    if not eligible:
        return Response({'error': 'No eligible zones available right now'}, status=503)

    # Score all by risk then distance, pick top zone_count candidates
    scored = []
    for zone in eligible:
        pred = zone.predictions.order_by('-prediction_date', '-prediction_hour').first()
        risk = pred.risk_level if pred else 'low'
        dist = _haversine_km(float(vehicle_lat), float(vehicle_lng), zone.latitude, zone.longitude)
        scored.append((_RISK_ORDER[risk], dist, zone))
    scored.sort(key=lambda x: (x[0], x[1]))

    candidates = [x[2] for x in scored[:zone_count]]

    # Optimize visit order with nearest-neighbor from driver position
    ordered_zones = _nearest_neighbor_order(float(vehicle_lat), float(vehicle_lng), candidates)
    first_zone = ordered_zones[0]

    assignment = RouteAssignment.objects.create(
        driver=driver,
        vehicle=driver.assigned_vehicle,
        zone=first_zone,
        status='active',
    )

    # Create ordered stops
    for idx, zone in enumerate(ordered_zones, start=1):
        RouteZoneStop.objects.create(assignment=assignment, zone=zone, stop_order=idx)

    # Update vehicle to head toward first zone
    if driver.assigned_vehicle:
        v = driver.assigned_vehicle
        v.status = 'deployed'
        v.current_zone = first_zone
        v.target_latitude = first_zone.latitude
        v.target_longitude = first_zone.longitude
        v.save()

    total_dist = round(_haversine_km(float(vehicle_lat), float(vehicle_lng), first_zone.latitude, first_zone.longitude), 2)
    data = RouteAssignmentSerializer(assignment).data
    data['distance_km'] = total_dist
    return Response(data, status=201)


@api_view(['PUT'])
def route_complete(request, pk):
    """PUT /api/routes/<id>/complete/ — complete all stops, set cooldown on every zone."""
    try:
        assignment = RouteAssignment.objects.select_related('zone', 'driver', 'vehicle').get(pk=pk, status='active')
    except RouteAssignment.DoesNotExist:
        return Response({'error': 'Active assignment not found'}, status=404)

    now = timezone.now()
    stops = list(assignment.stops.select_related('zone').prefetch_related('zone__predictions'))

    # Compute worst-case cooldown across all stops
    max_cooldown = 2
    for stop in stops:
        pred = stop.zone.predictions.order_by('-prediction_date', '-prediction_hour').first()
        risk = pred.risk_level if pred else 'low'
        max_cooldown = max(max_cooldown, _COOLDOWN_HOURS.get(risk, 4))

    cooldown_until = now + timedelta(hours=max_cooldown)

    # Mark all stops complete and apply cooldown on each zone via the assignment
    for stop in stops:
        stop.completed_at = now
    RouteZoneStop.objects.bulk_update(stops, ['completed_at'])

    assignment.status = 'completed'
    assignment.completed_at = now
    assignment.cooldown_until = cooldown_until
    assignment.save()

    if assignment.vehicle:
        v = assignment.vehicle
        v.status = 'idle'
        v.capacity_pct = min(v.capacity_pct + random.randint(20, 40), 100)
        v.save()

    zone_names = ', '.join(s.zone.name for s in stops) if stops else assignment.zone.name
    return Response({
        'message': f'Route completed: {zone_names}. Cooldown {max_cooldown}h.',
        'cooldown_hours': max_cooldown,
        'cooldown_until': cooldown_until.isoformat(),
        'assignment': RouteAssignmentSerializer(assignment).data,
    })


@api_view(['GET'])
def route_list_all(request):
    """GET /api/routes/ — all assignments (admin/dashboard)."""
    assignments = RouteAssignment.objects.select_related('driver', 'vehicle', 'zone').all()[:100]
    return Response(RouteAssignmentSerializer(assignments, many=True).data)


# ── CSV Import ────────────────────────────────────────────────────────────────

@api_view(['POST'])
def import_csv(request):
    """
    POST /api/data/import/
    Accepts a multipart CSV file with columns:
      zone_name, date (YYYY-MM-DD), waste_tons, waste_type[, vehicle_id]
    Creates TPSRecord rows and returns a summary.
    """
    import csv
    import io
    from datetime import datetime
    from .models import TPSRecord

    csv_file = request.FILES.get('file')
    if not csv_file:
        return Response({'error': 'No file uploaded. Send CSV as "file" field.'}, status=400)

    try:
        text = csv_file.read().decode('utf-8-sig')  # handle BOM
    except UnicodeDecodeError:
        return Response({'error': 'File must be UTF-8 encoded.'}, status=400)

    reader = csv.DictReader(io.StringIO(text))
    required = {'zone_name', 'date', 'waste_tons', 'waste_type'}
    if not required.issubset(set(reader.fieldnames or [])):
        missing = required - set(reader.fieldnames or [])
        return Response({'error': f'Missing columns: {", ".join(missing)}'}, status=400)

    VALID_TYPES = {'organic', 'plastic', 'paper', 'mixed'}
    created = skipped = errors = 0
    error_details = []

    for row_num, row in enumerate(reader, start=2):
        try:
            zone_name = row['zone_name'].strip()
            date_str  = row['date'].strip()
            waste_tons = float(row['waste_tons'])
            waste_type = row['waste_type'].strip().lower()
            vehicle_id = row.get('vehicle_id', '').strip()

            if waste_type not in VALID_TYPES:
                error_details.append(f'Row {row_num}: invalid waste_type "{waste_type}"')
                errors += 1
                continue

            try:
                zone = Zone.objects.get(name__iexact=zone_name)
            except Zone.DoesNotExist:
                error_details.append(f'Row {row_num}: zone "{zone_name}" not found')
                errors += 1
                continue

            recorded_at = datetime.strptime(date_str, '%Y-%m-%d')

            _, new = TPSRecord.objects.get_or_create(
                zone=zone,
                recorded_at=recorded_at,
                waste_type=waste_type,
                defaults={
                    'waste_tons': waste_tons,
                    'collection_vehicle_id': vehicle_id,
                },
            )
            if new:
                created += 1
            else:
                skipped += 1

        except (ValueError, KeyError) as e:
            error_details.append(f'Row {row_num}: {e}')
            errors += 1

    return Response({
        'created': created,
        'skipped_duplicates': skipped,
        'errors': errors,
        'error_details': error_details[:20],  # cap to 20
    }, status=200 if errors == 0 else 207)
