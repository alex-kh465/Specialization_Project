
import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, Wind, Droplets, Eye, Thermometer, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  feelsLike: number;
  location: string;
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

const Weather: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [quote, setQuote] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationData, setLocationData] = useState<any>(null);

  const quotes = [
    "The expert in anything was once a beginner. Keep learning! 📚",
    "Success is the sum of small efforts repeated day in and day out. 💪",
    "Don't watch the clock; do what it does. Keep going! ⏰",
    "The future belongs to those who believe in the beauty of their dreams. ✨",
    "Education is the passport to the future. Study hard! 🎓"
  ];

  // Function to detect user's location via IP
  const detectLocation = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/location/detect`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to detect location');
      }
      
      const data = await res.json();
      setLocationData(data);
      setLocationDetected(true);
      
      // Update city display name
      setCity(data.city || 'Unknown Location');
      
      return data;
    } catch (err: any) {
      console.error('Location detection failed:', err);
      throw err;
    }
  };

  // Function to fetch weather data
  const fetchWeather = async (cityName?: string, coordinates?: {lat: number, lon: number}) => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      let url = `${API_URL}/weather`;
      const params = new URLSearchParams();
      
      if (coordinates) {
        // Use coordinates if available (more accurate)
        params.append('lat', coordinates.lat.toString());
        params.append('lon', coordinates.lon.toString());
      } else if (cityName) {
        // Fall back to city name
        params.append('city', cityName);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data = await res.json();
      setWeather(data);
      setSuggestion(getWeatherSuggestions(data.condition, data.temperature));
    } catch (err: any) {
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  // Function to auto-detect location and fetch weather
  const fetchWeatherWithAutoLocation = async () => {
    try {
      const location = await detectLocation();
      await fetchWeather(undefined, {
        lat: location.latitude,
        lon: location.longitude
      });
    } catch (err) {
      // Fallback to Bangalore if location detection fails
      console.log('Auto-location failed, falling back to Bangalore');
      setCity('Bangalore');
      await fetchWeather('Bangalore');
    }
  };

  // Function to manually update location
  const handleLocationUpdate = async () => {
    await fetchWeatherWithAutoLocation();
  };

  const getWeatherSuggestions = (condition: string, temp: number) => {
    if (condition.toLowerCase().includes('rain')) {
      return "🌧️ Rainy day ahead! Perfect weather for indoor studying. Don't forget your umbrella if you need to go out.";
    }
    if (temp > 30) {
      return "🌞 It's quite hot today! Stay hydrated and consider studying in a cool place during peak hours.";
    }
    if (temp < 15) {
      return "🧥 Chilly weather! Dress warmly and maybe brew some hot tea while studying.";
    }
    return "🌤️ Perfect weather for outdoor study sessions or a walk to refresh your mind!";
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="w-16 h-16 text-yellow-500" />;
      case 'cloudy':
      case 'overcast':
      case 'partly cloudy':
        return <Cloud className="w-16 h-16 text-gray-500" />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="w-16 h-16 text-blue-500" />;
      default:
        return <Sun className="w-16 h-16 text-yellow-500" />;
    }
  };

  useEffect(() => {
    // Set random quote on component mount
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    // Auto-detect location and fetch weather data
    fetchWeatherWithAutoLocation();
  }, []);

  const handleCityChange = () => {
    if (city.trim()) {
      setLocationDetected(false);
      fetchWeather(city.trim());
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weather & Daily Tips</h1>
          <p className="text-gray-600">Loading weather data...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weather & Daily Tips</h1>
          <p className="text-red-600">Error: {error}</p>
          <p className="text-sm text-gray-600 mt-2">
            {error.includes('location') 
              ? 'Location detection failed. You can try searching for your city manually below.'
              : 'Weather service is temporarily unavailable. Please try again or search for a specific city.'}
          </p>
        </div>
        
        {/* Manual location search in case of error */}
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Try entering your city name (e.g., Mumbai, Bangalore, Chennai)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCityChange()}
              className="flex-1"
            />
            <Button onClick={handleCityChange} disabled={!city.trim()}>
              Search Weather
            </Button>
          </div>
        </Card>
        
        <div className="flex gap-2">
          <Button onClick={() => fetchWeatherWithAutoLocation()} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Auto-location Again
          </Button>
          <Button variant="outline" onClick={() => fetchWeather('Bangalore')} className="mt-4">
            Use Default (Bangalore)
          </Button>
        </div>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weather & Daily Tips</h1>
        <p className="text-gray-600">Stay informed and motivated throughout your day</p>
      </div>

      {/* Location Search */}
      {!locationDetected && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter city name (e.g., Bangalore, Mumbai, Chennai)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCityChange()}
              className="flex-1"
            />
            <Button onClick={handleCityChange} disabled={!city.trim()}>
              Search
            </Button>
            <Button variant="outline" onClick={handleLocationUpdate}>
              📍 Auto-detect
            </Button>
          </div>
        </Card>
      )}

      {/* Current Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Weather</h2>
              <p className="text-sm text-gray-600">{weather.location}</p>
              {locationDetected && locationData && (
                <p className="text-xs text-green-600 mt-1">
                  📍 Location auto-detected via IP ({locationData.region}, {locationData.country})
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleLocationUpdate}>
              📍 Update Location
            </Button>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            {getWeatherIcon(weather.condition)}
            <div>
              <div className="text-4xl font-bold text-gray-900">
                {weather.temperature}°C
              </div>
              <p className="text-lg text-gray-600">{weather.condition}</p>
              <p className="text-sm text-gray-500">
                Feels like {weather.feelsLike}°C
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Humidity</p>
              <p className="text-sm font-medium">{weather.humidity}%</p>
            </div>
            <div className="text-center">
              <Wind className="w-5 h-5 text-gray-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Wind</p>
              <p className="text-sm font-medium">{weather.windSpeed} km/h</p>
            </div>
            <div className="text-center">
              <Eye className="w-5 h-5 text-gray-500 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Visibility</p>
              <p className="text-sm font-medium">{weather.visibility} km</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">5-Day Forecast</h2>
          <div className="space-y-3">
            {['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'].map((day, index) => (
              <div key={day} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700">{day}</span>
                <div className="flex items-center space-x-3">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">
                    {weather.temperature + (Math.random() * 6 - 3) >> 0}°/{weather.temperature - 5}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Daily Motivation */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl">💡</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Motivation</h3>
            <p className="text-gray-700 leading-relaxed">{quote}</p>
          </div>
        </div>
      </Card>

      {/* Weather-based Suggestions */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Thermometer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Today's Study Tip</h3>
            <p className="text-gray-700 leading-relaxed">{suggestion}</p>
          </div>
        </div>
      </Card>

      {/* Study Environment Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimal Study Conditions</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Temperature: 20-22°C (ideal for focus)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Humidity: 40-60% (comfortable)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Current: {weather.temperature}°C, {weather.humidity}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Reminders</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-lg">💧</span>
              <span className="text-sm text-gray-700">Stay hydrated - drink water regularly</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-lg">👀</span>
              <span className="text-sm text-gray-700">Take 20-20-20 breaks for your eyes</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-lg">🚶</span>
              <span className="text-sm text-gray-700">Get some fresh air during study breaks</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Weather;
