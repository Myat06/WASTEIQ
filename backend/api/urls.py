from django.urls import path
from . import views

urlpatterns = [
    # Zones
    path('zones/', views.zone_list),
    path('zones/<int:pk>/', views.zone_detail),

    # Events / Permits
    path('events/', views.event_list),
    path('events/calendar/', views.event_calendar),

    # Predictions
    path('predictions/', views.prediction_list),
    path('predictions/generate/', views.prediction_generate),
    path('predictions/heatmap/', views.prediction_heatmap),

    # Simulator
    path('simulator/', views.simulator),

    # Fleet
    path('fleet/', views.fleet_list),
    path('fleet/<int:pk>/', views.fleet_detail),
    path('fleet/dispatch/', views.fleet_dispatch),

    # Drivers
    path('drivers/', views.driver_list),
    path('drivers/<int:pk>/report/', views.driver_report),

    # Reports & Model
    path('reports/summary/', views.reports_summary),
    path('model/performance/', views.model_performance),

    # Weather (bonus)
    path('weather/current/', views.weather_current),
    path('weather/forecast/', views.weather_forecast),

    # CSV Import
    path('data/import/', views.import_csv),

    # Route Assignments
    path('routes/', views.route_list_all),
    path('routes/my/', views.route_my),
    path('routes/request/', views.route_request),
    path('routes/<int:pk>/complete/', views.route_complete),
]
