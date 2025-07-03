'use client';

import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface StatusBadgeProps {
  status: string;
  color: string;
  urgency: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  color,
  urgency,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  // Color classes based on the color prop
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
    orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
    red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
    gray: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
    purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700'
  };

  // Get icon based on status
  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
    
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon className={iconSize} />;
      case 'expired':
        return <XCircleIcon className={iconSize} />;
      case 'expiring soon':
      case 'expiring':
        return <ExclamationTriangleIcon className={iconSize} />;
      case 'pending':
        return <ClockIcon className={iconSize} />;
      case 'terminated':
        return <XCircleIcon className={iconSize} />;
      default:
        return <ClockIcon className={iconSize} />;
    }
  };

  // Animation variants based on urgency
  const getAnimationVariants = () => {
    if (urgency === 'high') {
      return {
        initial: { scale: 1 },
        animate: { 
          scale: [1, 1.05, 1],
          transition: { 
            duration: 2, 
            repeat: Infinity,
            repeatType: 'loop' as const
          }
        }
      };
    }
    return {
      initial: { scale: 1 },
      animate: { scale: 1 }
    };
  };

  // Get appropriate color class
  const getColorClass = () => {
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;
  };

  return (
    <motion.span
      variants={getAnimationVariants()}
      initial="initial"
      animate="animate"
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${sizeClasses[size]}
        ${getColorClass()}
        ${className}
      `}
    >
      {showIcon && getIcon()}
      <span className="whitespace-nowrap">{status}</span>
      
      {/* Urgency indicator dot */}
      {urgency === 'high' && (
        <motion.div
          animate={{ 
            opacity: [1, 0.3, 1],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            repeatType: 'loop'
          }}
          className="w-2 h-2 bg-current rounded-full"
        />
      )}
    </motion.span>
  );
};

export default StatusBadge; 