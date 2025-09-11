'use client';

import React, { useEffect, useState } from 'react';
import { expensesApi } from '@/lib/api';

/**
 * ExpenseAnalytics
 * Lightweight analytics widgets (no chart lib dependency):
 * - Monthly trend (last 12 months)
 * - By category totals
 * - Top properties this month
 */
export default function ExpenseAnalytics() {
  const [data, setData] = useState<{ monthly_trend: any[]; by_category: any[]; top_properties: any[] }>({ monthly_trend: [], by_category: [], top_properties: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await expensesApi.getExpenseAnalytics();
        setData(res);
      } catch (e: any) {
        setError('Failed to load analytics');
      }
    };
    load();
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Monthly Expenses Trend</h3>
        <div className="space-y-2">
          {data.monthly_trend.map((m) => (
            <div key={m.month} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{m.month}</span>
              <span className="font-medium">{formatCurrency(m.total)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">By Category</h3>
        <div className="space-y-2">
          {data.by_category.map((c) => (
            <div key={c.category} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{c.category}</span>
              <span className="font-medium">{formatCurrency(c.total)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Top Properties (This Month)</h3>
        <div className="space-y-2">
          {data.top_properties.map((p) => (
            <div key={p.property_name} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{p.property_name}</span>
              <span className="font-medium">{formatCurrency(p.total)}</span>
            </div>
          ))}
        </div>
      </div>
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}


