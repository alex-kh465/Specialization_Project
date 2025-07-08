
import React, { useState } from 'react';
import { MessageCircle, Calendar, Mail, Sun, FileText, Calculator, Crown, Zap, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import UsageMeter from '@/components/common/UsageMeter';

interface FeatureUsage {
  name: string;
  icon: React.ElementType;
  current: number;
  total: number;
  isPro?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

const Usage: React.FC = () => {
  const currentPlan = 'Free' as 'Free' | 'Pro'; // This would come from user context/auth
  const isPremium = currentPlan === 'Pro';

  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = 'http://localhost:4000';
  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

  const fetchUsageStats = async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/usage/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch usage stats');
      }
      
      const data = await res.json();
      setUsageData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const featureUsage: FeatureUsage[] = usageData ? [
    { name: 'AI Chat Messages', icon: MessageCircle, current: usageData.limits.aiChats.current, total: usageData.limits.aiChats.total, color: 'blue' },
    { name: 'Calendar Events', icon: Calendar, current: usageData.limits.calendarEvents.current, total: usageData.limits.calendarEvents.total, color: 'green' },
    { name: 'Email Summaries', icon: Mail, current: usageData.limits.emailSummaries.current, total: usageData.limits.emailSummaries.total, isPro: usageData.limits.emailSummaries.isPro, color: 'yellow' },
    { name: 'Weather Requests', icon: Sun, current: usageData.limits.weatherRequests.current, total: usageData.limits.weatherRequests.total, color: 'green' },
    { name: 'Daily Digests', icon: FileText, current: usageData.limits.dailyDigests.current, total: usageData.limits.dailyDigests.total, color: 'red' },
    { name: 'Budget Exports', icon: Calculator, current: usageData.limits.budgetExports.current, total: usageData.limits.budgetExports.total, color: 'yellow' }
  ] : [];

  const weeklyStats = usageData ? usageData.weekly : {
    totalInteractions: 0,
    mostUsedFeature: 'Loading...',
    timesSaved: '0 hours',
    streakDays: 0
  };

  React.useEffect(() => {
    fetchUsageStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage & Access</h1>
          <p className="text-gray-600">Track your feature usage and manage your plan</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={isPremium ? "default" : "secondary"} className="px-3 py-1">
            {isPremium ? (
              <>
                <Crown className="w-4 h-4 mr-1 text-yellow-500" />
                Pro Plan
              </>
            ) : (
              'Free Plan'
            )}
          </Badge>
          {!isPremium && (
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Zap className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>

      {/* Plan Overview */}
      <Card className={`${isPremium ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-gray-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isPremium ? (
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">{currentPlan} Plan</h2>
                <p className="text-gray-600">
                  {isPremium ? 'Unlimited access to all features' : 'Limited access to basic features'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {isPremium ? '₹199/month' : '₹0/month'}
              </p>
              <p className="text-sm text-gray-600">
                {isPremium ? 'Billed monthly' : 'Free forever'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{weeklyStats.totalInteractions}</div>
            <p className="text-sm text-gray-600">Total Interactions</p>
            <p className="text-xs text-gray-500 mt-1">This week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{weeklyStats.mostUsedFeature}</div>
            <p className="text-sm text-gray-600">Most Used Feature</p>
            <p className="text-xs text-gray-500 mt-1">45% of usage</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{weeklyStats.timesSaved}</div>
            <p className="text-sm text-gray-600">Time Saved</p>
            <p className="text-xs text-gray-500 mt-1">Estimated</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">{weeklyStats.streakDays}</div>
            <p className="text-sm text-gray-600">Active Streak</p>
            <p className="text-xs text-gray-500 mt-1">Days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Feature Usage</span>
            <Badge variant="outline" className="text-xs">Daily Limits</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureUsage.map((feature) => (
              <div key={feature.name} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <feature.icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{feature.name}</span>
                  {feature.isPro && !isPremium && (
                    <Lock className="w-4 h-4 text-purple-500" />
                  )}
                </div>
                <UsageMeter
                  current={feature.isPro && !isPremium ? 0 : feature.current}
                  total={feature.total}
                  label=""
                  color={feature.color}
                  isPro={feature.isPro && !isPremium}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Banner */}
      {!isPremium && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unlock Premium Features</h3>
                  <p className="text-gray-600">Get unlimited access to all tools and features</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span>✅ Unlimited AI chats</span>
                    <span>✅ Email summarization</span>
                    <span>✅ Priority support</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
                <p className="text-sm text-gray-600 mt-2">Starting at ₹199/month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'AI Chat', time: '2 minutes ago', details: 'Asked about calculus problem' },
              { action: 'Weather Check', time: '1 hour ago', details: 'Checked today\'s forecast' },
              { action: 'Calendar Event', time: '3 hours ago', details: 'Added "Study Session"' },
              { action: 'Budget Entry', time: '1 day ago', details: 'Added lunch expense ₹150' },
              { action: 'Daily Digest', time: '1 day ago', details: 'Generated morning summary' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.details}</p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usage;
