
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isPro?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  isPro = false,
  isLocked = false,
  onClick,
  children,
  className
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden",
        isLocked && "opacity-60",
        className
      )}
      onClick={onClick}
    >
      {isPro && (
        <div className="absolute top-4 right-4">
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
            Pro
          </span>
        </div>
      )}
      
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm mb-4">{description}</p>
          
          {children}
        </div>
      </div>
      
      {isLocked && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">🔒</span>
            </div>
            <p className="text-sm font-medium text-gray-900">Upgrade to Pro</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureCard;
