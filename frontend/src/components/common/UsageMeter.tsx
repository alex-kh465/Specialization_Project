
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Lock } from 'lucide-react';

interface UsageMeterProps {
  current: number;
  total: number;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  isPro?: boolean;
}

const UsageMeter: React.FC<UsageMeterProps> = ({ 
  current, 
  total, 
  label, 
  color = 'blue',
  isPro = false
}) => {
  const percentage = (current / total) * 100;
  
  const getColorClass = () => {
    switch (color) {
      case 'green': return 'text-green-600';
      case 'yellow': return 'text-yellow-600';
      case 'red': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {isPro && (
            <div className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-purple-600 font-medium">Pro</span>
            </div>
          )}
        </div>
        <span className={`text-sm font-semibold ${getColorClass()}`}>
          {current}/{total}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      {percentage >= 80 && !isPro && (
        <p className="text-xs text-orange-600">
          You're close to your limit. Consider upgrading to Pro!
        </p>
      )}
      {isPro && (
        <p className="text-xs text-purple-600">
          Upgrade to Pro to unlock this feature!
        </p>
      )}
    </div>
  );
};

export default UsageMeter;
