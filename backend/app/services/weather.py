import time
from datetime import date, datetime, timedelta

import httpx
from fastapi import HTTPException

WMO_TEXT = {
    0: "晴",
    1: "大致晴朗",
    2: "多雲",
    3: "陰",
    45: "有霧",
    48: "霧凇",
    51: "細雨",
    53: "小雨",
    55: "大雨",
    56: "凍雨",
    57: "強凍雨",
    61: "小雨",
    63: "下雨",
    65: "大雨",
    66: "凍雨",
    67: "強凍雨",
    71: "小雪",
    73: "下雪",
    75: "大雪",
    77: "雪粒",
    80: "陣雨",
    81: "強陣雨",
    82: "暴雨",
    85: "陣雪",
    86: "強陣雪",
    95: "雷雨",
    96: "雷雨冰雹",
    99: "強雷雨",
}

_cache: dict[str, tuple[float, dict]] = {}
CACHE_SECONDS = 600


def weather_text(code: int | float | None) -> str:
    try:
        return WMO_TEXT.get(int(code or 0), "多雲")
    except (TypeError, ValueError):
        return "多雲"


async def fetch_weather(
    lat: float, lon: float, city: str | None = None
) -> dict:
    key = f"{round(lat, 2)}:{round(lon, 2)}"
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < CACHE_SECONDS:
        payload = dict(cached[1])
        if city:
            payload["location"] = {**payload["location"], "name": city}
        return payload

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,apparent_temperature,precipitation,"
        "weather_code,wind_speed_10m,relative_humidity_2m"
        "&daily=temperature_2m_max,temperature_2m_min,"
        "precipitation_probability_max,weather_code"
        "&timezone=auto&forecast_days=7"
    )
    try:
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
    except Exception:
        raise HTTPException(502, "天氣服務暫時無法使用，請稍後再試")

    current = data.get("current") or {}
    daily = data.get("daily") or {}
    days = []
    dates = daily.get("time") or []
    for index, day in enumerate(dates):
        days.append(
            {
                "date": day,
                "max_c": float(
                    (daily.get("temperature_2m_max") or [0])[index]
                ),
                "min_c": float(
                    (daily.get("temperature_2m_min") or [0])[index]
                ),
                "rain_prob": int(
                    (daily.get("precipitation_probability_max") or [0])[
                        index
                    ]
                    or 0
                ),
                "code": int((daily.get("weather_code") or [0])[index] or 0),
                "text": weather_text(
                    (daily.get("weather_code") or [0])[index]
                ),
            }
        )

    rain_prob = days[0]["rain_prob"] if days else 0
    payload = {
        "location": {
            "name": city or "目前位置",
            "lat": lat,
            "lon": lon,
        },
        "current": {
            "temp_c": float(current.get("temperature_2m") or 0),
            "feels_like_c": float(
                current.get("apparent_temperature")
                or current.get("temperature_2m")
                or 0
            ),
            "rain_mm": float(current.get("precipitation") or 0),
            "rain_prob": rain_prob,
            "wind_kph": float(current.get("wind_speed_10m") or 0),
            "humidity": int(current.get("relative_humidity_2m") or 0),
            "code": int(current.get("weather_code") or 0),
            "text": weather_text(current.get("weather_code")),
        },
        "daily": days,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "source": "open-meteo",
    }
    _cache[key] = (now, payload)
    return payload


def manual_weather(
    temp_c: float,
    rain_prob: int = 0,
    text: str = "多雲",
    city: str = "手動天氣",
) -> dict:
    code = 61 if "雨" in text else 3 if "陰" in text else 2 if "雲" in text else 0
    today = date.today()
    days = []
    for index in range(7):
        day = today + timedelta(days=index)
        days.append(
            {
                "date": day.isoformat(),
                "max_c": round(temp_c + 3, 1),
                "min_c": round(temp_c - 3, 1),
                "rain_prob": rain_prob,
                "code": code,
                "text": text,
            }
        )
    return {
        "location": {"name": city, "lat": 0, "lon": 0},
        "current": {
            "temp_c": float(temp_c),
            "feels_like_c": float(temp_c),
            "rain_mm": 0,
            "rain_prob": int(rain_prob),
            "wind_kph": 0,
            "humidity": 60,
            "code": code,
            "text": text,
        },
        "daily": days,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "source": "manual",
    }


async def search_city(query: str) -> list[dict]:
    q = query.strip()
    if not q:
        return []
    url = "https://geocoding-api.open-meteo.com/v1/search"
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(
                url,
                params={
                    "name": q,
                    "count": 6,
                    "language": "zh",
                    "format": "json",
                },
            )
            response.raise_for_status()
            data = response.json()
    except Exception:
        raise HTTPException(502, "找不到城市資料，請稍後再試")

    results = []
    for row in data.get("results") or []:
        results.append(
            {
                "id": row.get("id"),
                "name": row.get("name"),
                "country": row.get("country") or "",
                "admin1": row.get("admin1") or "",
                "lat": row.get("latitude"),
                "lon": row.get("longitude"),
            }
        )
    return results
