
import React, { useState } from 'react';
import { Mail, Clock, Settings, Send, Calendar, Sun, BookOpen, Target, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const Digest: React.FC = () => {
  const [digestSettings, setDigestSettings] = useState({
    enabled: true,
    preferredTime: '08:00',
    includeWeather: true,
    includeCalendar: true,
    includeQuote: true,
    includeBudget: true,
    emailAddress: 'student@example.com'
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const digestPreview = {
    date: new Date().toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    weather: {
      location: 'Mumbai, Maharashtra',
      temperature: '28°C',
      condition: 'Partly Cloudy',
      suggestion: 'Perfect weather for outdoor study! ☀️'
    },
    upcomingEvents: [
      { title: 'Math Exam', time: '10:00 AM', type: 'exam' },
      { title: 'Physics Lab', time: '2:00 PM', type: 'class' },
      { title: 'Study Group', time: '5:00 PM', type: 'personal' }
    ],
    quote: {
      text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      author: "Winston Churchill"
    },
    budgetSummary: {
      spent: 1800,
      budget: 5000,
      remaining: 3200
    }
  };

  const generateDigest = async () => {
    setIsGenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    // In real app, this would trigger email send
    alert('Daily digest sent to your email!');
  };

  const updateSetting = (key: string, value: any) => {
    setDigestSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Digest</h1>
          <p className="text-gray-600">Get your personalized daily summary via email</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button 
            onClick={generateDigest} 
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Digest Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Digest Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Enable Daily Digest</Label>
                <p className="text-xs text-gray-600">Receive daily summaries via email</p>
              </div>
              <Switch 
                checked={digestSettings.enabled}
                onCheckedChange={(checked) => updateSetting('enabled', checked)}
              />
            </div>

            <div>
              <Label htmlFor="time">Preferred Time</Label>
              <Input
                id="time"
                type="time"
                value={digestSettings.preferredTime}
                onChange={(e) => updateSetting('preferredTime', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={digestSettings.emailAddress}
                onChange={(e) => updateSetting('emailAddress', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium">Include in Digest</Label>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sun className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Weather & Suggestions</span>
                </div>
                <Switch 
                  checked={digestSettings.includeWeather}
                  onCheckedChange={(checked) => updateSetting('includeWeather', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Upcoming Events</span>
                </div>
                <Switch 
                  checked={digestSettings.includeCalendar}
                  onCheckedChange={(checked) => updateSetting('includeCalendar', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Daily Quote</span>
                </div>
                <Switch 
                  checked={digestSettings.includeQuote}
                  onCheckedChange={(checked) => updateSetting('includeQuote', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">Budget Summary</span>
                </div>
                <Switch 
                  checked={digestSettings.includeBudget}
                  onCheckedChange={(checked) => updateSetting('includeBudget', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digest Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span>Digest Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white border rounded-lg p-6 space-y-6 max-h-96 overflow-y-auto">
              {/* Email Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">Your Daily Digest</h2>
                <p className="text-gray-600">{digestPreview.date}</p>
              </div>

              {/* Weather Section */}
              {digestSettings.includeWeather && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-orange-500" />
                    <span>Today's Weather</span>
                  </h3>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <strong>{digestPreview.weather.location}</strong> - {digestPreview.weather.temperature}, {digestPreview.weather.condition}
                    </p>
                    <p className="text-sm text-orange-600 mt-1">{digestPreview.weather.suggestion}</p>
                  </div>
                </div>
              )}

              {/* Calendar Section */}
              {digestSettings.includeCalendar && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Today's Schedule</span>
                  </h3>
                  <div className="space-y-2">
                    {digestPreview.upcomingEvents.map((event, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{event.title}</span>
                        <span className="text-sm text-blue-600">{event.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quote Section */}
              {digestSettings.includeQuote && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-green-500" />
                    <span>Daily Inspiration</span>
                  </h3>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-sm italic text-gray-700">"{digestPreview.quote.text}"</p>
                    <p className="text-sm text-green-600 mt-1">— {digestPreview.quote.author}</p>
                  </div>
                </div>
              )}

              {/* Budget Section */}
              {digestSettings.includeBudget && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span>Budget Update</span>
                  </h3>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      Spent: <strong>₹{digestPreview.budgetSummary.spent}</strong> of ₹{digestPreview.budgetSummary.budget}
                    </p>
                    <p className="text-sm text-purple-600 mt-1">
                      ₹{digestPreview.budgetSummary.remaining} remaining this month
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Scheduled Delivery</h3>
                <p className="text-gray-600">
                  {digestSettings.enabled 
                    ? `Next digest will be sent tomorrow at ${digestSettings.preferredTime}`
                    : 'Daily digest is currently disabled'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Bell className={`w-5 h-5 ${digestSettings.enabled ? 'text-green-500' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${digestSettings.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                {digestSettings.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Digest;
