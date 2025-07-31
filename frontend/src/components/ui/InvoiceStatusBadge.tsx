import React from 'react';
import { LockClosedIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface InvoiceStatusBadgeProps {
  status: 'draft' | 'sent' | 'locked' | 'paid' | 'overdue' | 'cancelled';
  isLocked?: boolean;
  className?: string;
}

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ 
  status, 
  isLocked = false, 
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        };
      case 'sent':
        return {
          label: 'Sent',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: null
        };
      case 'locked':
        return {
          label: 'Locked',
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: <LockClosedIcon className="h-3 w-3" />
        };
      case 'paid':
        return {
          label: 'Paid',
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircleIcon className="h-3 w-3" />
        };
      case 'overdue':
        return {
          label: 'Overdue',
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <ExclamationTriangleIcon className="h-3 w-3" />
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.className} ${className}`}>
      {isLocked && status !== 'locked' && <LockClosedIcon className="h-3 w-3" />}
      {config.icon}
      <span>{config.label}</span>
      {isLocked && status !== 'locked' && <span className="text-xs">(Locked)</span>}
    </div>
  );
};

export default InvoiceStatusBadge; 