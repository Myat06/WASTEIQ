from django.contrib import admin
from .models import Zone, EventPermit, TPSRecord, Prediction, FleetVehicle, Driver, RouteAssignment, RouteZoneStop, FieldReport


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'municipality', 'land_use', 'population', 'is_active']
    list_filter = ['municipality', 'land_use', 'is_active']
    search_fields = ['name', 'kelurahan', 'kecamatan']


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'name', 'phone', 'is_on_duty', 'assigned_vehicle', 'assigned_zone']
    list_filter = ['is_on_duty']
    search_fields = ['employee_id', 'name']


@admin.register(FleetVehicle)
class FleetVehicleAdmin(admin.ModelAdmin):
    list_display = ['vehicle_id', 'vehicle_type', 'capacity_kg', 'status', 'current_zone']
    list_filter = ['status', 'vehicle_type']
    search_fields = ['vehicle_id']


@admin.register(EventPermit)
class EventPermitAdmin(admin.ModelAdmin):
    list_display = ['permit_number', 'event_name', 'event_type', 'zone', 'event_date', 'expected_attendees', 'status']
    list_filter = ['event_type', 'status']
    search_fields = ['permit_number', 'event_name', 'organizer_name']
    date_hierarchy = 'event_date'


@admin.register(TPSRecord)
class TPSRecordAdmin(admin.ModelAdmin):
    list_display = ['zone', 'recorded_at', 'waste_tons', 'waste_type', 'collection_vehicle_id']
    list_filter = ['waste_type', 'zone']
    date_hierarchy = 'recorded_at'


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ['zone', 'prediction_date', 'prediction_hour', 'total_waste_kg', 'risk_level', 'trucks_needed']
    list_filter = ['risk_level', 'weather_condition', 'day_type']
    search_fields = ['zone__name']
    date_hierarchy = 'prediction_date'


@admin.register(RouteAssignment)
class RouteAssignmentAdmin(admin.ModelAdmin):
    list_display = ['driver', 'vehicle', 'zone', 'status', 'assigned_at', 'completed_at']
    list_filter = ['status']
    search_fields = ['driver__name', 'driver__employee_id']


@admin.register(RouteZoneStop)
class RouteZoneStopAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'zone', 'stop_order', 'completed_at']


@admin.register(FieldReport)
class FieldReportAdmin(admin.ModelAdmin):
    list_display = ['driver', 'zone', 'report_type', 'reported_at']
    list_filter = ['report_type']
    search_fields = ['driver__name', 'description']
    date_hierarchy = 'reported_at'
