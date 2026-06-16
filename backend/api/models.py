from django.db import models


class Zone(models.Model):
    LAND_USE_CHOICES = [
        ('Residential', 'Residential'),
        ('Commercial', 'Commercial'),
        ('Industrial', 'Industrial'),
        ('Coastal', 'Coastal'),
    ]
    MUNICIPALITY_CHOICES = [
        ('Central', 'Central Jakarta'),
        ('South', 'South Jakarta'),
        ('North', 'North Jakarta'),
        ('East', 'East Jakarta'),
        ('West', 'West Jakarta'),
    ]

    name = models.CharField(max_length=100)
    kelurahan = models.CharField(max_length=100)
    kecamatan = models.CharField(max_length=100)
    municipality = models.CharField(max_length=50, choices=MUNICIPALITY_CHOICES)
    land_use = models.CharField(max_length=30, choices=LAND_USE_CHOICES)
    latitude = models.FloatField()
    longitude = models.FloatField()
    baseline_waste_kg_per_day = models.FloatField()
    area_sqkm = models.FloatField()
    population = models.IntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.municipality})"


class EventPermit(models.Model):
    EVENT_TYPES = [
        ('food_festival', 'Food Festival'),
        ('concert', 'Concert'),
        ('marathon', 'Marathon'),
        ('political_rally', 'Political Rally'),
        ('street_market', 'Street Market'),
        ('sports_match', 'Sports Match'),
        ('religious_gathering', 'Religious Gathering'),
        ('night_market', 'Night Market'),
        ('exhibition', 'Exhibition'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
    ]

    permit_number = models.CharField(max_length=50, unique=True)
    event_name = models.CharField(max_length=200)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='events')
    expected_attendees = models.IntegerField()
    event_date = models.DateField()
    start_time = models.TimeField()
    duration_hours = models.FloatField()
    organizer_name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.permit_number} - {self.event_name}"


class TPSRecord(models.Model):
    WASTE_TYPES = [
        ('organic', 'Organic'),
        ('plastic', 'Plastic'),
        ('paper', 'Paper'),
        ('mixed', 'Mixed'),
    ]

    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='tps_records')
    recorded_at = models.DateTimeField()
    waste_tons = models.FloatField()
    waste_type = models.CharField(max_length=20, choices=WASTE_TYPES)
    collection_vehicle_id = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.zone.name} - {self.recorded_at.date()} - {self.waste_tons}t"


class Prediction(models.Model):
    RISK_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='predictions')
    event = models.ForeignKey(EventPermit, on_delete=models.SET_NULL, null=True, blank=True)
    prediction_date = models.DateField()
    prediction_hour = models.IntegerField(default=0)
    total_waste_kg = models.FloatField()
    event_waste_kg = models.FloatField(default=0)
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS)
    workers_needed = models.IntegerField()
    man_hours_required = models.FloatField()
    trucks_needed = models.IntegerField()
    temp_bins_needed = models.IntegerField(default=0)
    temp_tps_units_needed = models.IntegerField(default=0)
    confidence_lower = models.FloatField()
    confidence_upper = models.FloatField()
    weather_condition = models.CharField(max_length=20, default='sunny')
    day_type = models.CharField(max_length=20, default='weekday')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['prediction_date', 'prediction_hour']

    def __str__(self):
        return f"{self.zone.name} - {self.prediction_date} H{self.prediction_hour} [{self.risk_level}]"


class FleetVehicle(models.Model):
    VEHICLE_TYPES = [
        ('compactor', 'Compactor Truck'),
        ('organic_hauler', 'Organic Hauler'),
        ('recycling_unit', 'Recycling Unit'),
        ('tipper', 'Tipper Truck'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('idle', 'Idle'),
        ('maintenance', 'Maintenance'),
        ('deployed', 'Deployed'),
    ]

    vehicle_id = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=30, choices=VEHICLE_TYPES)
    capacity_kg = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='idle')
    current_zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True)
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    target_latitude = models.FloatField(null=True, blank=True)
    target_longitude = models.FloatField(null=True, blank=True)
    capacity_pct = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vehicle_id} ({self.vehicle_type}) - {self.status}"


class Driver(models.Model):
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=20)
    assigned_vehicle = models.OneToOneField(
        FleetVehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='driver'
    )
    assigned_zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True)
    is_on_duty = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.employee_id})"


class RouteAssignment(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]

    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='route_assignments')
    vehicle = models.ForeignKey(FleetVehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='route_assignments')
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='route_assignments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cooldown_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.driver.name} → {self.zone.name} [{self.status}]"


class RouteZoneStop(models.Model):
    """Ordered zone stops within a multi-zone RouteAssignment."""
    assignment = models.ForeignKey(RouteAssignment, on_delete=models.CASCADE, related_name='stops')
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='zone_stops')
    stop_order = models.PositiveSmallIntegerField()
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['stop_order']
        unique_together = [['assignment', 'stop_order']]

    def __str__(self):
        return f"Stop {self.stop_order}: {self.zone.name}"


class FieldReport(models.Model):
    REPORT_TYPES = [
        ('bin_full', 'Bin Full'),
        ('illegal_dump', 'Illegal Dumping'),
        ('collection_done', 'Collection Confirmed'),
        ('road_blocked', 'Road Blocked'),
        ('other', 'Other'),
    ]

    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='reports')
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='field_reports')
    report_type = models.CharField(max_length=30, choices=REPORT_TYPES)
    description = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo = models.ImageField(upload_to='field_reports/', null=True, blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.driver.name} - {self.report_type} @ {self.zone.name}"
