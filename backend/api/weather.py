import requests
from datetime import date

JAKARTA_LAT = -6.2
JAKARTA_LNG = 106.8

# WMO weather code → our internal weather condition
WMO_TO_CONDITION = {
    range(0, 2): 'sunny',
    range(2, 4): 'cloudy',
    range(51, 68): 'rainy',
    range(80, 83): 'rainy',
    range(95, 100): 'storm',
}


def _wmo_to_condition(code):
    for r, cond in WMO_TO_CONDITION.items():
        if code in r:
            return cond
    if code in (45, 48):
        return 'cloudy'
    if code >= 68:
        return 'rainy'
    return 'sunny'


def get_current_weather():
    """Fetch current weather for Jakarta from Open-Meteo (no API key needed)."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={JAKARTA_LAT}&longitude={JAKARTA_LNG}"
            f"&current=weathercode,temperature_2m,precipitation"
            f"&timezone=Asia%2FJakarta"
        )
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        current = data.get('current', {})
        code = current.get('weathercode', 0)
        return {
            'condition': _wmo_to_condition(code),
            'temperature': current.get('temperature_2m'),
            'precipitation': current.get('precipitation', 0),
            'wmo_code': code,
            'source': 'open-meteo',
        }
    except Exception:
        return {'condition': 'sunny', 'temperature': 30, 'precipitation': 0, 'source': 'fallback'}


def get_hourly_forecast():
    """Fetch 24-hour hourly forecast for Jakarta."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={JAKARTA_LAT}&longitude={JAKARTA_LNG}"
            f"&hourly=weathercode,temperature_2m,precipitation_probability"
            f"&forecast_days=1"
            f"&timezone=Asia%2FJakarta"
        )
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        hourly = data.get('hourly', {})
        times = hourly.get('time', [])
        codes = hourly.get('weathercode', [])
        temps = hourly.get('temperature_2m', [])
        precip = hourly.get('precipitation_probability', [])

        return [
            {
                'hour': i,
                'time': times[i] if i < len(times) else None,
                'condition': _wmo_to_condition(codes[i]) if i < len(codes) else 'sunny',
                'temperature': temps[i] if i < len(temps) else 30,
                'precipitation_probability': precip[i] if i < len(precip) else 0,
            }
            for i in range(24)
        ]
    except Exception:
        return [
            {'hour': i, 'condition': 'sunny', 'temperature': 30, 'precipitation_probability': 0}
            for i in range(24)
        ]
