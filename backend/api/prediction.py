EVENT_COEFFICIENTS = {
    'food_festival': 18.5,
    'concert': 9.2,
    'marathon': 4.1,
    'political_rally': 6.8,
    'street_market': 12.3,
    'sports_match': 7.5,
    'religious_gathering': 5.9,
    'night_market': 14.2,
    'exhibition': 8.1,
    'other': 7.0,
}

WEATHER_MULTIPLIERS = {
    'sunny': 1.0,
    'cloudy': 1.05,
    'rainy': 1.15,
    'storm': 1.35,
}

DAY_MULTIPLIERS = {
    'weekday': 1.0,
    'weekend': 1.25,
    'holiday': 1.45,
}

RISK_THRESHOLDS = {
    'critical': 180,
    'high': 120,
    'medium': 80,
    'low': 0,
}


def predict_waste(event_type, attendees, duration_hours, weather, day_type, zone_baseline_kg):
    event_coeff = EVENT_COEFFICIENTS.get(event_type, 7.0)
    weather_mult = WEATHER_MULTIPLIERS.get(weather, 1.0)
    day_mult = DAY_MULTIPLIERS.get(day_type, 1.0)

    event_waste_kg = (event_coeff * attendees / 100) * (duration_hours / 6) * weather_mult * day_mult
    total_waste_kg = zone_baseline_kg + event_waste_kg
    additional_waste_kg = event_waste_kg

    if additional_waste_kg > RISK_THRESHOLDS['critical']:
        risk = 'critical'
    elif additional_waste_kg > RISK_THRESHOLDS['high']:
        risk = 'high'
    elif additional_waste_kg > RISK_THRESHOLDS['medium']:
        risk = 'medium'
    else:
        risk = 'low'

    workers_needed = max(2, int(total_waste_kg / 200) + 1)
    man_hours = workers_needed * duration_hours
    trucks_needed = max(1, int(total_waste_kg / 3000) + 1)
    temp_bins_needed = max(0, int(additional_waste_kg / 500))
    temp_tps_needed = max(0, int(additional_waste_kg / 2000))

    return {
        'total_waste_kg': round(total_waste_kg, 2),
        'event_waste_kg': round(event_waste_kg, 2),
        'risk_level': risk,
        'workers_needed': workers_needed,
        'man_hours_required': man_hours,
        'trucks_needed': trucks_needed,
        'temp_bins_needed': temp_bins_needed,
        'temp_tps_units_needed': temp_tps_needed,
        'confidence_interval': {
            'lower': round(total_waste_kg * 0.85, 2),
            'upper': round(total_waste_kg * 1.15, 2),
        },
    }


def predict_baseline(zone_baseline_kg, weather, day_type):
    """Predict waste for a zone with no event — just baseline + multipliers."""
    weather_mult = WEATHER_MULTIPLIERS.get(weather, 1.0)
    day_mult = DAY_MULTIPLIERS.get(day_type, 1.0)
    total = zone_baseline_kg * weather_mult * day_mult
    additional = total - zone_baseline_kg

    if additional > RISK_THRESHOLDS['critical']:
        risk = 'critical'
    elif additional > RISK_THRESHOLDS['high']:
        risk = 'high'
    elif additional > RISK_THRESHOLDS['medium']:
        risk = 'medium'
    else:
        risk = 'low'

    workers_needed = max(2, int(total / 200) + 1)
    trucks_needed = max(1, int(total / 3000) + 1)

    return {
        'total_waste_kg': round(total, 2),
        'event_waste_kg': 0,
        'risk_level': risk,
        'workers_needed': workers_needed,
        'man_hours_required': workers_needed * 8,
        'trucks_needed': trucks_needed,
        'temp_bins_needed': 0,
        'temp_tps_units_needed': 0,
        'confidence_interval': {
            'lower': round(total * 0.85, 2),
            'upper': round(total * 1.15, 2),
        },
    }


RISK_COLORS = {
    'critical': '#E24B4A',
    'high': '#EF9F27',
    'medium': '#FAC775',
    'low': '#1D9E75',
}
