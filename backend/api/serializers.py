from rest_framework import serializers
from .models import Zone, EventPermit, TPSRecord, Prediction, FleetVehicle, Driver, FieldReport, RouteAssignment, RouteZoneStop


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = '__all__'


class ZoneListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for zone list (includes latest risk)."""
    risk_level = serializers.SerializerMethodField()
    current_waste_kg = serializers.SerializerMethodField()

    class Meta:
        model = Zone
        fields = [
            'id', 'name', 'kelurahan', 'kecamatan', 'municipality', 'land_use',
            'latitude', 'longitude', 'baseline_waste_kg_per_day', 'area_sqkm',
            'population', 'is_active', 'risk_level', 'current_waste_kg',
        ]

    def get_risk_level(self, obj):
        pred = obj.predictions.order_by('-prediction_date', '-prediction_hour').first()
        return pred.risk_level if pred else 'low'

    def get_current_waste_kg(self, obj):
        pred = obj.predictions.order_by('-prediction_date', '-prediction_hour').first()
        return pred.total_waste_kg if pred else obj.baseline_waste_kg_per_day


class EventPermitSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    zone_lat = serializers.FloatField(source='zone.latitude', read_only=True)
    zone_lng = serializers.FloatField(source='zone.longitude', read_only=True)

    class Meta:
        model = EventPermit
        fields = '__all__'


class TPSRecordSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='zone.name', read_only=True)

    class Meta:
        model = TPSRecord
        fields = '__all__'


class PredictionSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    zone_lat = serializers.FloatField(source='zone.latitude', read_only=True)
    zone_lng = serializers.FloatField(source='zone.longitude', read_only=True)

    class Meta:
        model = Prediction
        fields = '__all__'


class FleetVehicleSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source='current_zone.name', read_only=True, default=None)
    driver_name = serializers.SerializerMethodField()

    class Meta:
        model = FleetVehicle
        fields = '__all__'

    def get_driver_name(self, obj):
        if hasattr(obj, 'driver') and obj.driver:
            return obj.driver.name
        return None


class DriverSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.CharField(source='assigned_vehicle.vehicle_id', read_only=True, default=None)
    vehicle_lat = serializers.FloatField(source='assigned_vehicle.current_latitude', read_only=True, default=None)
    vehicle_lng = serializers.FloatField(source='assigned_vehicle.current_longitude', read_only=True, default=None)
    zone_name = serializers.CharField(source='assigned_zone.name', read_only=True, default=None)
    assigned_zone_name = serializers.CharField(source='assigned_zone.name', read_only=True, default=None)

    class Meta:
        model = Driver
        fields = '__all__'


class FieldReportSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)

    class Meta:
        model = FieldReport
        fields = '__all__'


class RouteZoneStopSerializer(serializers.ModelSerializer):
    zone_id = serializers.IntegerField(source='zone.id', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    zone_lat = serializers.FloatField(source='zone.latitude', read_only=True)
    zone_lng = serializers.FloatField(source='zone.longitude', read_only=True)
    zone_municipality = serializers.CharField(source='zone.municipality', read_only=True)
    risk_level = serializers.SerializerMethodField()
    total_waste_kg = serializers.SerializerMethodField()

    class Meta:
        model = RouteZoneStop
        fields = ['stop_order', 'zone_id', 'zone_name', 'zone_lat', 'zone_lng',
                  'zone_municipality', 'risk_level', 'total_waste_kg', 'completed_at']

    def get_risk_level(self, obj):
        pred = obj.zone.predictions.order_by('-prediction_date', '-prediction_hour').first()
        return pred.risk_level if pred else 'low'

    def get_total_waste_kg(self, obj):
        pred = obj.zone.predictions.order_by('-prediction_date', '-prediction_hour').first()
        return pred.total_waste_kg if pred else obj.zone.baseline_waste_kg_per_day


class RouteAssignmentSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    employee_id = serializers.CharField(source='driver.employee_id', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    zone_lat = serializers.FloatField(source='zone.latitude', read_only=True)
    zone_lng = serializers.FloatField(source='zone.longitude', read_only=True)
    zone_municipality = serializers.CharField(source='zone.municipality', read_only=True)
    vehicle_id = serializers.CharField(source='vehicle.vehicle_id', read_only=True, default=None)
    vehicle_lat = serializers.FloatField(source='vehicle.current_latitude', read_only=True, default=None)
    vehicle_lng = serializers.FloatField(source='vehicle.current_longitude', read_only=True, default=None)
    risk_level = serializers.SerializerMethodField()
    total_waste_kg = serializers.SerializerMethodField()
    workers_needed = serializers.SerializerMethodField()
    stops = RouteZoneStopSerializer(many=True, read_only=True)

    class Meta:
        model = RouteAssignment
        fields = '__all__'

    def _latest_pred(self, obj):
        return obj.zone.predictions.order_by('-prediction_date', '-prediction_hour').first()

    def get_risk_level(self, obj):
        pred = self._latest_pred(obj)
        return pred.risk_level if pred else 'low'

    def get_total_waste_kg(self, obj):
        pred = self._latest_pred(obj)
        return pred.total_waste_kg if pred else obj.zone.baseline_waste_kg_per_day

    def get_workers_needed(self, obj):
        pred = self._latest_pred(obj)
        return pred.workers_needed if pred else 2
