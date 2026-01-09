
import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, TrendingUp, TrendingDown, DollarSign, Calendar, Target, Download, Flame,
  Settings, Edit2, Save, X, BarChart3, PieChart, LineChart, Filter, RefreshCw,
  AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart as RechartsPieChart, Cell, Pie,
  LineChart as RechartsLineChart, Line, Area, AreaChart
} from 'recharts';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface BudgetSettings {
  monthly_budget: number;
  category_limits: Record<string, number>;
}

interface Analytics {
  totalSpent: number;
  expenseCount: number;
  averagePerDay: number;
  categoryBreakdown: Record<string, { total: number; count: number }>;
  monthlyTrends: Record<string, number>;
  dailySpending: Record<string, number>;
  topExpenses: Expense[];
  spendingPatterns: {
    weekdays: number[];
    monthlyAverage: number;
  };
}

const CHART_COLORS = {
  Food: '#ef4444',
  Transport: '#3b82f6', 
  Books: '#10b981',
  Entertainment: '#f59e0b',
  Miscellaneous: '#8b5cf6',
  default: '#6b7280'
};

const Budget: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', category: 'Food', amount: 500, description: 'Lunch at canteen', date: '2024-01-15' },
    { id: '2', category: 'Transport', amount: 200, description: 'Bus fare', date: '2024-01-14' },
    { id: '3', category: 'Books', amount: 800, description: 'Programming books', date: '2024-01-13' },
    { id: '4', category: 'Entertainment', amount: 300, description: 'Movie tickets', date: '2024-01-12' }
  ]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('3months');
  const [isLoading, setIsLoading] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({
    monthly_budget: 5000,
    category_limits: {
      Food: 2000,
      Transport: 800,
      Books: 1000,
      Entertainment: 800,
      Miscellaneous: 400
    }
  });

  const [tempBudgetSettings, setTempBudgetSettings] = useState<BudgetSettings>(budgetSettings);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budgetLeft = budgetSettings.monthly_budget - totalSpent;
  const budgetPercentage = (totalSpent / budgetSettings.monthly_budget) * 100;
  const streak = 12; // Days of maintaining budget discipline

  const categories = ['Food', 'Transport', 'Books', 'Entertainment', 'Miscellaneous'];

  // Load budget settings and analytics
  useEffect(() => {
    loadBudgetSettings();
    loadAnalytics();
  }, [analyticsTimeframe]);

  const loadBudgetSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/budget/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBudgetSettings(data);
      setTempBudgetSettings(data);
    } catch (error) {
      console.error('Failed to load budget settings:', error);
    }
  };

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/budget/analytics?timeframe=${analyticsTimeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBudgetSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/budget/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tempBudgetSettings)
      });
      
      if (response.ok) {
        setBudgetSettings(tempBudgetSettings);
        setIsEditingBudget(false);
        setIsEditingLimits(false);
        setShowSettingsModal(false);
      }
    } catch (error) {
      console.error('Failed to save budget settings:', error);
    }
  };

  const addExpense = () => {
    if (newExpense.category && newExpense.amount && newExpense.description) {
      const expense: Expense = {
        id: Date.now().toString(),
        category: newExpense.category,
        amount: Number(newExpense.amount),
        description: newExpense.description,
        date: newExpense.date
      };
      setExpenses(prev => [expense, ...prev]);
      setNewExpense({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      setShowAddModal(false);
    }
  };

  const getCategoryTotal = (category: string) => {
    return expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0);
  };

  const exportData = () => {
    const data = expenses.map(e => `${e.date},${e.category},₹${e.amount},${e.description}`).join('\n');
    const blob = new Blob([`Date,Category,Amount,Description\n${data}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Planner</h1>
          <p className="text-gray-600">Track your expenses and manage your student budget</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Budget Settings</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="budget" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="budget">Monthly Budget</TabsTrigger>
                  <TabsTrigger value="limits">Category Limits</TabsTrigger>
                </TabsList>
                
                <TabsContent value="budget" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Monthly Budget (₹)</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={tempBudgetSettings.monthly_budget}
                          onChange={(e) => setTempBudgetSettings(prev => ({
                            ...prev,
                            monthly_budget: Number(e.target.value)
                          }))}
                          disabled={!isEditingBudget}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingBudget(!isEditingBudget)}
                        >
                          {isEditingBudget ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {budgetPercentage > 100 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Budget Exceeded!</AlertTitle>
                        <AlertDescription>
                          You've spent ₹{(totalSpent - budgetSettings.monthly_budget).toLocaleString()} over your budget this month.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="limits" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Category Spending Limits</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingLimits(!isEditingLimits)}
                      >
                        {isEditingLimits ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </Button>
                    </div>
                    
                    {categories.map(category => {
                      const spent = getCategoryTotal(category);
                      const limit = tempBudgetSettings.category_limits[category] || 0;
                      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">{category}</Label>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">₹{spent}/₹{limit}</span>
                              <Input
                                type="number"
                                value={tempBudgetSettings.category_limits[category] || 0}
                                onChange={(e) => setTempBudgetSettings(prev => ({
                                  ...prev,
                                  category_limits: {
                                    ...prev.category_limits,
                                    [category]: Number(e.target.value)
                                  }
                                }))}
                                disabled={!isEditingLimits}
                                className="w-24 h-8"
                              />
                            </div>
                          </div>
                          <Progress value={Math.min(percentage, 100)} className="h-2" />
                          {percentage > 90 && (
                            <p className="text-xs text-orange-600">
                              ⚠️ Approaching limit for {category}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setTempBudgetSettings(budgetSettings);
                  setIsEditingBudget(false);
                  setIsEditingLimits(false);
                  setShowSettingsModal(false);
                }}>
                  Cancel
                </Button>
                <Button onClick={saveBudgetSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Monthly Budget</p>
                <p className="text-2xl font-bold text-gray-900">₹{budgetSettings.monthly_budget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">₹{totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Budget Left</p>
                <p className={`text-2xl font-bold ${budgetLeft >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(budgetLeft).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Discipline Streak</p>
                <p className="text-2xl font-bold text-orange-600">{streak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Spent: ₹{totalSpent.toLocaleString()}</span>
              <span>{budgetPercentage.toFixed(1)}% of budget used</span>
            </div>
            <Progress value={Math.min(budgetPercentage, 100)} className="h-3" />
            {budgetPercentage > 80 && (
              <p className="text-sm text-orange-600 mt-2">
                ⚠️ You're approaching your budget limit. Consider reducing expenses.
              </p>
            )}
            {budgetPercentage > 100 && (
              <p className="text-sm text-red-600 mt-2">
                🚨 You've exceeded your budget by ₹{(totalSpent - budgetSettings.monthly_budget).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Spending Analytics</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAnalytics()}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </Button>
              <Select value={analyticsTimeframe} onValueChange={setAnalyticsTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">1 Month</SelectItem>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Total Spent</Label>
                  <div className="text-2xl font-bold text-red-600">
                    ₹{analytics?.totalSpent.toLocaleString() || totalSpent.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">
                    Avg ₹{analytics?.averagePerDay.toFixed(0) || '0'}/day
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Total Transactions</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.expenseCount || expenses.length}
                  </div>
                  <p className="text-xs text-gray-500">This period</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Budget Status</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {budgetPercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500">Used this month</p>
                </div>
              </div>
              
              {/* Category Pie Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-4">Category Distribution</h4>
                  <ChartContainer
                    config={Object.fromEntries(
                      categories.map(cat => [cat, { label: cat, color: CHART_COLORS[cat] || CHART_COLORS.default }])
                    )}
                    className="h-64"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={categories.map(cat => ({
                            name: cat,
                            value: getCategoryTotal(cat),
                            fill: CHART_COLORS[cat] || CHART_COLORS.default
                          })).filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categories.map((cat, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[cat] || CHART_COLORS.default} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-4">Category Limits vs Spending</h4>
                  <ChartContainer
                    config={Object.fromEntries(
                      categories.map(cat => [cat, { label: cat, color: CHART_COLORS[cat] || CHART_COLORS.default }])
                    )}
                    className="h-64"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categories.map(cat => ({
                          name: cat,
                          spent: getCategoryTotal(cat),
                          limit: budgetSettings.category_limits[cat] || 0
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="limit" fill="#e5e7eb" name="Limit" />
                        <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-4">Monthly Spending Trends</h4>
                <ChartContainer
                  config={{
                    spending: { label: "Spending", color: "#3b82f6" }
                  }}
                  className="h-64"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={Object.entries(analytics?.monthlyTrends || {}).map(([month, amount]) => ({
                        month: month.substring(5), // Get MM part
                        amount: amount
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="patterns" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-4">Spending by Weekday</h4>
                  <ChartContainer
                    config={{
                      spending: { label: "Spending", color: "#10b981" }
                    }}
                    className="h-64"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
                          day,
                          amount: analytics?.spendingPatterns.weekdays[index] || 0
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="amount" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-4">Top Expenses</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(analytics?.topExpenses || expenses.slice(0, 5)).map((expense, index) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">#{index + 1}</Badge>
                          <div>
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-gray-500">{expense.category} • {expense.date}</p>
                          </div>
                        </div>
                        <span className="font-bold text-red-600">₹{expense.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Spending Insights</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Average daily spending: ₹{analytics?.averagePerDay.toFixed(0) || (totalSpent / 30).toFixed(0)}</li>
                      <li>• Most expensive category: {Object.entries(
                        analytics?.categoryBreakdown || categories.reduce((acc, cat) => {
                          acc[cat] = { total: getCategoryTotal(cat), count: 0 };
                          return acc;
                        }, {})
                      ).sort(([,a], [,b]) => b.total - a.total)[0]?.[0] || 'None'}</li>
                      <li>• Monthly average: ₹{analytics?.spendingPatterns.monthlyAverage.toFixed(0) || totalSpent.toFixed(0)}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Recommendations</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1 text-sm">
                      {budgetPercentage > 90 && <li>• Consider reducing discretionary spending</li>}
                      {getCategoryTotal('Entertainment') > budgetSettings.category_limits.Entertainment * 0.8 && 
                        <li>• Entertainment spending is approaching limit</li>}
                      {budgetPercentage < 70 && <li>• Great job staying within budget!</li>}
                      <li>• Set up automatic savings for unused budget</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Category Breakdown & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map(category => {
                const total = getCategoryTotal(category);
                const limit = budgetSettings.category_limits[category] || 0;
                const percentage = limit > 0 ? (total / limit) * 100 : 0;
                const totalPercentage = total > 0 ? (total / totalSpent) * 100 : 0;
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[category] }}></div>
                        <span>{category}</span>
                      </span>
                      <div className="text-right">
                        <span className="font-semibold">₹{total.toLocaleString()}</span>
                        {limit > 0 && (
                          <div className="text-xs text-gray-500">of ₹{limit.toLocaleString()} limit</div>
                        )}
                      </div>
                    </div>
                    <Progress value={Math.min(percentage, 100)} className="h-2" />
                    {percentage > 90 && (
                      <p className="text-xs text-orange-600">⚠️ Approaching category limit</p>
                    )}
                    {percentage > 100 && (
                      <p className="text-xs text-red-600">🚨 Category limit exceeded</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenses.slice(0, 6).map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[expense.category] }}></div>
                    <div>
                      <p className="font-medium text-gray-900">{expense.description}</p>
                      <p className="text-sm text-gray-600">{expense.category} • {expense.date}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-red-600">-₹{expense.amount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What did you spend on?"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button onClick={addExpense} className="flex-1">Add Expense</Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Budget;
