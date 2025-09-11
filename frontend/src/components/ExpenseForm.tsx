'use client';

import React, { useEffect, useState } from 'react';
import { expensesApi, Expense, ExpenseCategory, Supplier, propertyAPI } from '@/lib/api';

interface ExpenseFormProps {
  expense?: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * ExpenseForm
 * Modal-friendly form for creating or editing an expense.
 * This component intentionally avoids external modal dependencies so it can be
 * embedded into any dialog container.
 */
export default function ExpenseForm({ expense, onClose, onSaved }: ExpenseFormProps) {
  const [title, setTitle] = useState(expense?.title || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState<number>(expense?.amount || 0);
  const [taxAmount, setTaxAmount] = useState<number>(expense?.tax_amount || 0);
  const [totalAmount, setTotalAmount] = useState<number>(expense?.total_amount || 0);
  const [expenseDate, setExpenseDate] = useState<string>(expense?.expense_date || new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Expense['status']>(expense?.status || 'draft');
  const [propertyId, setPropertyId] = useState<string | number>(expense?.property || '');
  const [categoryId, setCategoryId] = useState<number>(Number(expense?.category) || 0);
  const [supplierId, setSupplierId] = useState<number | null>(expense?.supplier ? Number(expense?.supplier) : null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(expense?.invoice_number || '');
  const [referenceNumber, setReferenceNumber] = useState<string>(expense?.reference_number || '');
  const [isRecurring, setIsRecurring] = useState<boolean>(expense?.is_recurring || false);
  const [recurringFrequency, setRecurringFrequency] = useState<string>(expense?.recurring_frequency || '');

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, sups, props] = await Promise.all([
          expensesApi.listCategories(),
          expensesApi.listSuppliers(),
          propertyAPI.list({ page_size: 1000 })
        ]);
        setCategories(Array.isArray(cats) ? cats : []);
        setSuppliers(Array.isArray(sups) ? sups : []);
        setProperties(props.results || props || []);
      } catch (e: any) {
        setError('Failed to load reference data');
      }
    };
    load();
  }, []);

  useEffect(() => {
    // Keep total in sync if amount or tax change
    setTotalAmount(Number(amount || 0) + Number(taxAmount || 0));
  }, [amount, taxAmount]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload: Partial<Expense> = {
        title,
        description,
        amount: Number(amount || 0),
        tax_amount: Number(taxAmount || 0),
        total_amount: Number(totalAmount || 0),
        expense_date: expenseDate,
        status,
        property: propertyId,
        category: categoryId,
        supplier: supplierId || undefined,
        invoice_number: invoiceNumber,
        reference_number: referenceNumber,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : '',
      } as any;

      if (expense?.id) {
        await expensesApi.updateExpense(expense.id, payload);
      } else {
        await expensesApi.createExpense(payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-md p-2 text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Title</label>
          <input className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Date</label>
          <input type="date" className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Property</label>
          <select className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
            <option value="">Select property</option>
            {(properties || []).map((p: any) => (
              <option key={p.id || p.property_code} value={p.id || p.property_code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Category</label>
          <select className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
            <option value="0">Select category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Supplier</label>
          <select className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={supplierId ?? ''} onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">None</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Status</label>
          <select className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value as Expense['status'])}>
            {['draft','pending_approval','approved','paid','rejected'].map(s => (
              <option key={s} value={s}>{s.replace('_',' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Invoice #</label>
          <input className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Reference</label>
          <input className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Amount (excl. tax)</label>
          <input type="number" className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={amount} onChange={e => setAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Tax amount</label>
          <input type="number" className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={taxAmount} onChange={e => setTaxAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Total</label>
          <input type="number" className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={totalAmount} onChange={e => setTotalAmount(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Description</label>
        <textarea className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <input id="recurring" type="checkbox" className="h-4 w-4" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
        <label htmlFor="recurring" className="text-sm">Recurring expense</label>
        {isRecurring && (
          <input placeholder="monthly|quarterly|annually" className="ml-3 flex-1 bg-muted/50 border border-border rounded-md px-3 py-2 text-sm" value={recurringFrequency} onChange={e => setRecurringFrequency(e.target.value)} />
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-md bg-muted text-foreground border border-border text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">
          {saving ? 'Saving...' : (expense ? 'Update Expense' : 'Create Expense')}
        </button>
      </div>
    </div>
  );
}


