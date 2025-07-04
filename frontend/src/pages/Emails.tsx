
import React, { useState } from 'react';
import { Mail, Lock, Zap, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmailSummary {
  id: string;
  sender: string;
  subject: string;
  summary: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

const Emails: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [emailSummaries, setEmailSummaries] = useState<EmailSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const mockSummaries: EmailSummary[] = [
    {
      id: '1',
      sender: 'Prof. Sharma',
      subject: 'Assignment Deadline Extension',
      summary: 'The professor has extended the deadline for the Data Structures assignment by 3 days due to technical issues with the submission portal.',
      timestamp: '2 hours ago',
      priority: 'high'
    },
    {
      id: '2',
      sender: 'College Admin',
      subject: 'Fee Payment Reminder',
      summary: 'Reminder about pending semester fee payment. The deadline is approaching in 5 days.',
      timestamp: '4 hours ago',
      priority: 'medium'
    },
    {
      id: '3',
      sender: 'Study Group',
      subject: 'Meeting Reschedule',
      summary: 'The weekly study group meeting has been moved from Thursday 4 PM to Friday 3 PM due to scheduling conflicts.',
      timestamp: '1 day ago',
      priority: 'low'
    }
  ];

  const handleSummarizeEmails = () => {
    setIsLoading(true);
    setTimeout(() => {
      setEmailSummaries(mockSummaries);
      setIsLoading(false);
    }, 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Email Summarizer</h1>
            <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
              <Lock className="w-3 h-3" />
              <span>Pro</span>
            </div>
          </div>
          <p className="text-gray-600">Get AI-powered summaries of your important emails</p>
        </div>
      </div>

      {/* Pro Feature Lock */}
      <Card className="p-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Unlock Email Summarization</h3>
            <p className="text-gray-600 mt-2">
              Upgrade to Pro to automatically summarize your emails and save hours every week
            </p>
          </div>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Zap className="w-4 h-4 mr-2" />
            Upgrade to Pro - ₹99/month
          </Button>
        </div>
      </Card>

      {/* Gmail Connection (Pro Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Connect Gmail Account</h3>
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Connect your Gmail account to start receiving AI-powered email summaries
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsConnected(true)}
                disabled
                className="w-full opacity-50"
              >
                <Mail className="w-4 h-4 mr-2" />
                Connect Gmail (Pro Feature)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-green-900">student@example.com</p>
                  <p className="text-sm text-green-700">Connected successfully</p>
                </div>
              </div>
              
              <Button 
                onClick={handleSummarizeEmails}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Summarizing...' : 'Summarize Last 10 Emails'}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">How it Works</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <p className="text-sm text-gray-600">Connect your Gmail account securely</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">2</span>
              </div>
              <p className="text-sm text-gray-600">AI analyzes your recent emails</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">3</span>
              </div>
              <p className="text-sm text-gray-600">Get concise summaries with key points</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Email Summaries */}
      {emailSummaries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Email Summaries</h2>
          
          <div className="space-y-4">
            {emailSummaries.map((email) => (
              <Card key={email.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{email.sender}</p>
                      <p className="text-sm text-gray-600">{email.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(email.priority)}`}>
                      {email.priority}
                    </span>
                    <span className="text-xs text-gray-500">{email.timestamp}</span>
                  </div>
                </div>
                
                <div className="pl-11">
                  <p className="text-gray-700 text-sm leading-relaxed">{email.summary}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Emails;
