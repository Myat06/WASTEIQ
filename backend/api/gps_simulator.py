"""
Fake GPS route simulator for fleet vehicles.
Each call to tick_fleet() nudges every deployed truck slightly toward its target zone,
simulating movement on the map without real GPS hardware.
"""
import math
import random
from django.utils import timezone


STEP_SIZE = 0.0008  # degrees per tick (~90m)


def _move_toward(current_lat, current_lng, target_lat, target_lng):
    """Move one step from current position toward target. Return new position."""
    dlat = target_lat - current_lat
    dlng = target_lng - current_lng
    dist = math.sqrt(dlat ** 2 + dlng ** 2)

    if dist < STEP_SIZE:
        # Arrived — add small jitter so the truck looks active
        return (
            target_lat + random.uniform(-0.0003, 0.0003),
            target_lng + random.uniform(-0.0003, 0.0003),
        )

    ratio = STEP_SIZE / dist
    return (
        current_lat + dlat * ratio + random.uniform(-0.0001, 0.0001),
        current_lng + dlng * ratio + random.uniform(-0.0001, 0.0001),
    )


def tick_fleet():
    """
    Advance all active/deployed vehicles one step along their simulated route.
    Call this from the fleet list API so positions update on every dashboard refresh.
    """
    from .models import FleetVehicle, Zone

    vehicles = FleetVehicle.objects.filter(status__in=['active', 'deployed'])
    zones = list(Zone.objects.filter(is_active=True).values('latitude', 'longitude'))

    for vehicle in vehicles:
        if vehicle.current_latitude is None:
            # Initialise at a random Jakarta zone centroid
            z = random.choice(zones)
            vehicle.current_latitude = z['latitude']
            vehicle.current_longitude = z['longitude']

        if vehicle.target_latitude is None:
            # Pick a random target zone
            z = random.choice(zones)
            vehicle.target_latitude = z['latitude']
            vehicle.target_longitude = z['longitude']

        new_lat, new_lng = _move_toward(
            vehicle.current_latitude, vehicle.current_longitude,
            vehicle.target_latitude, vehicle.target_longitude,
        )
        vehicle.current_latitude = new_lat
        vehicle.current_longitude = new_lng

        # Randomly vary capacity (simulate loading/unloading)
        vehicle.capacity_pct = min(100, max(0, vehicle.capacity_pct + random.randint(-5, 10)))

        # When truck reaches target, pick a new one
        dist = math.sqrt(
            (new_lat - vehicle.target_latitude) ** 2 +
            (new_lng - vehicle.target_longitude) ** 2
        )
        if dist < STEP_SIZE * 2:
            z = random.choice(zones)
            vehicle.target_latitude = z['latitude']
            vehicle.target_longitude = z['longitude']
            vehicle.capacity_pct = 0  # simulate emptying at destination

        vehicle.save(update_fields=[
            'current_latitude', 'current_longitude',
            'target_latitude', 'target_longitude',
            'capacity_pct', 'last_updated',
        ])
