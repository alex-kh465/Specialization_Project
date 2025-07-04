
import React, { useState } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, DollarSign, Calendar, Target, Download, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

const Budget: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', category: 'Food', amount: 500, description: 'Lunch at canteen', date: '2024-01-15' },
    { id: '2', category: 'Transport', amount: 200, description: 'Bus fare', date: '2024-01-14' },
    { id: '3', category: 'Books', amount: 800, description: 'Programming books', date: '2024-01-13' },
    { id: '4', category: 'Entertainment', amount: 300, description: 'Movie tickets', date: '2024-01-12' }
  ]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const monthlyBudget = 5000;
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budgetLeft = monthlyBudget - totalSpent;
  const budgetPercentage = (totalSpent / monthlyBudget) * 100;
  const streak = 12; // Days of maintaining budget discipline

  const categories = ['Food', 'Transport', 'Books', 'Entertainment', 'Miscellaneous'];

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
                <p className="text-2xl font-bold text-gray-900">₹{monthlyBudget.toLocaleString()}</p>
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
                🚨 You've exceeded your budget by ₹{(totalSpent - monthlyBudget).toLocaleString()}
              </p>
            )}
          </div>
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
                const percentage = total > 0 ? (total / totalSpent) * 100 : 0;
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{category}</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
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
                  <div>
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-sm text-gray-600">{expense.category} • {expense.date}</p>
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
