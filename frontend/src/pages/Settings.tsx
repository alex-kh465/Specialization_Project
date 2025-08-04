
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Shield, Moon, Globe, Smartphone, Mail, Lock, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'http://localhost:4000';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyDigest: true,
      studyReminders: true,
      budgetAlerts: false
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analyticsTracking: true
    },
    appearance: {
      theme: 'light',
      language: 'en'
    },
    account: {
      twoFactorAuth: false,
      sessionTimeout: '30'
    }
  });

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Clear local storage
      localStorage.removeItem('token');
      
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      // Redirect to login page
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account preferences and privacy settings</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">Free Plan</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-600">Receive updates via email</p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.notifications.emailNotifications}
                onCheckedChange={(value) => updateSetting('notifications', 'emailNotifications', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-gray-600">Get notified on your device</p>
              </div>
              <Switch
                id="push-notifications"
                checked={settings.notifications.pushNotifications}
                onCheckedChange={(value) => updateSetting('notifications', 'pushNotifications', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-sm text-gray-600">Summary of your week</p>
              </div>
              <Switch
                id="weekly-digest"
                checked={settings.notifications.weeklyDigest}
                onCheckedChange={(value) => updateSetting('notifications', 'weeklyDigest', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="study-reminders">Study Reminders</Label>
                <p className="text-sm text-gray-600">Get reminded about study sessions</p>
              </div>
              <Switch
                id="study-reminders"
                checked={settings.notifications.studyReminders}
                onCheckedChange={(value) => updateSetting('notifications', 'studyReminders', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="budget-alerts">Budget Alerts</Label>
                <p className="text-sm text-gray-600">Alerts when you exceed budget</p>
              </div>
              <Switch
                id="budget-alerts"
                checked={settings.notifications.budgetAlerts}
                onCheckedChange={(value) => updateSetting('notifications', 'budgetAlerts', value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Privacy & Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-visibility">Profile Visibility</Label>
              <Select
                value={settings.privacy.profileVisibility}
                onValueChange={(value) => updateSetting('privacy', 'profileVisibility', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="friends">Friends Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="data-sharing">Data Sharing</Label>
                <p className="text-sm text-gray-600">Share anonymous usage data</p>
              </div>
              <Switch
                id="data-sharing"
                checked={settings.privacy.dataSharing}
                onCheckedChange={(value) => updateSetting('privacy', 'dataSharing', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analytics">Analytics Tracking</Label>
                <p className="text-sm text-gray-600">Help improve our services</p>
              </div>
              <Switch
                id="analytics"
                checked={settings.privacy.analyticsTracking}
                onCheckedChange={(value) => updateSetting('privacy', 'analyticsTracking', value)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                <p className="text-sm text-gray-600">Add extra security to your account</p>
              </div>
              <Switch
                id="two-factor"
                checked={settings.account.twoFactorAuth}
                onCheckedChange={(value) => updateSetting('account', 'twoFactorAuth', value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Moon className="w-5 h-5" />
              <span>Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.appearance.theme}
                onValueChange={(value) => updateSetting('appearance', 'theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.appearance.language}
                onValueChange={(value) => updateSetting('appearance', 'language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Account Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Select
                value={settings.account.sessionTimeout}
                onValueChange={(value) => updateSetting('account', 'sessionTimeout', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export My Data
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Mail className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>

            <Separator />

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Danger Zone</h4>
              <p className="text-sm text-red-600 mb-3">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers, including:
                      <br /><br />
                      • Your profile information
                      • All expense records
                      • AI chat history
                      • Calendar events
                      • Settings and preferences
                      <br /><br />
                      You will need to create a new account to use our services again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Changes */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">Changes are automatically saved</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save All Changes</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
