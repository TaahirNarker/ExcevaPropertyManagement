'use client';

import { cn } from '@/lib/utils';

type Status = 'active' | 'inactive' | 'pending';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
} 