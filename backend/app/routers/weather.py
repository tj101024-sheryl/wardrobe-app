from fastapi import APIRouter, Query

from ..schemas import WeatherCityOut, WeatherOut
from ..services.weather import fetch_weather, search_city

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("", response_model=WeatherOut)
async def get_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    city: str | None = None,
):
    return await fetch_weather(lat, lon, city)


@router.get("/search", response_model=list[WeatherCityOut])
async def search_weather_city(
    q: str = Query(..., min_length=1, max_length=50),
):
    return await search_city(q)
