'use client';

import React, { useEffect, useState } from 'react';
import { expensesApi, Expense } from '@/lib/api';

interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
}

/**
 * ExpenseList
 * Paginated, filterable expense table.
 */
export default function ExpenseList({ onEdit }: ExpenseListProps) {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (status !== 'all') params.status = status;
      if (dateFrom) params.expense_date__gte = dateFrom;
      if (dateTo) params.expense_date__lte = dateTo;
      // Basic search on title/description via DRF search fields
      if (search) params.search = search;
      const res = await expensesApi.listExpenses(params);
      setItems(res.results || []);
    } catch (e: any) {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value || 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input placeholder="Search" className="bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
          {['all','draft','pending_approval','approved','paid','rejected'].map(s => (
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          ))}
        </select>
        <input type="date" className="bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Apply</button>
          <button onClick={() => { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo(''); load(); }} className="px-3 py-2 bg-muted text-foreground border border-border rounded-md text-sm">Reset</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Property</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Supplier</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t border-border/60">
                <td className="py-2 pr-4">{new Date(e.expense_date).toLocaleDateString()}</td>
                <td className="py-2 pr-4">{e.title}</td>
                <td className="py-2 pr-4">{e.property_name || e.property}</td>
                <td className="py-2 pr-4">{e.category_name || e.category}</td>
                <td className="py-2 pr-4">{e.supplier_name || ''}</td>
                <td className="py-2 pr-4">{formatCurrency(e.total_amount)}</td>
                <td className="py-2 pr-4 capitalize">{e.status.replace('_',' ')}</td>
                <td className="py-2 pr-4 text-right">
                  <button onClick={() => onEdit(e)} className="px-2 py-1 bg-muted border border-border rounded-md text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading expenses...</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}


