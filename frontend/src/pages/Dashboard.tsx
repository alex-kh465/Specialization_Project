
import React from 'react';
import { 
  MessageCircle, 
  Calendar, 
  Mail, 
  Sun, 
  FileText, 
  Calculator,
  TrendingUp,
  Clock
} from 'lucide-react';
import FeatureCard from '@/components/common/FeatureCard';
import UsageMeter from '@/components/common/UsageMeter';
import ChatInterface from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
          Welcome back, Student! 👋
        </h1>
        <p className="text-blue-100 mb-4">
          Ready to boost your academic productivity today?
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <p className="text-sm text-blue-100">Today's Tasks</p>
            <p className="text-xl font-bold">3 pending</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <p className="text-sm text-blue-100">Study Streak</p>
            <p className="text-xl font-bold">7 days 🔥</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          
          <FeatureCard
            title="AI Chat Assistant"
            description="Get instant help with your academic questions"
            icon={MessageCircle}
            onClick={() => navigate('/chat')}
          >
            <UsageMeter current={5} total={10} label="Daily Chat Limit" />
          </FeatureCard>

          <FeatureCard
            title="Smart Calendar"
            description="Manage your schedule with AI-powered reminders"
            icon={Calendar}
            onClick={() => navigate('/calendar')}
          >
            <Button variant="outline" size="sm" className="w-full">
              <Clock className="w-4 h-4 mr-2" />
              Add Quick Reminder
            </Button>
          </FeatureCard>

          <FeatureCard
            title="Email Summarizer"
            description="Get quick summaries of your important emails"
            icon={Mail}
            isPro
            isLocked
            onClick={() => navigate('/payments')}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">AI Assistant</h2>
          <ChatInterface />
        </div>
      </div>

      {/* More Features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">More Tools</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            title="Weather & Daily Tips"
            description="Get weather updates and daily motivation"
            icon={Sun}
            onClick={() => navigate('/weather')}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">☀️</span>
              <span className="text-sm text-gray-600">28°C, Sunny</span>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Daily Digest"
            description="Automated daily summary emails"
            icon={FileText}
            onClick={() => navigate('/digest')}
          >
            <Button variant="outline" size="sm" className="w-full">
              Send Now
            </Button>
          </FeatureCard>

          <FeatureCard
            title="Budget Planner"
            description="Track your student expenses"
            icon={Calculator}
            onClick={() => navigate('/budget')}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This month</span>
              <span className="text-lg font-semibold text-green-600">₹2,450 left</span>
            </div>
          </FeatureCard>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Today's Usage</h2>
          <Button variant="outline" size="sm" onClick={() => navigate('/usage')}>
            View Details
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UsageMeter current={5} total={10} label="AI Chat Messages" />
          <UsageMeter current={2} total={5} label="Calendar Syncs" color="green" />
          <UsageMeter current={8} total={10} label="Email Summaries" color="yellow" isPro />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
