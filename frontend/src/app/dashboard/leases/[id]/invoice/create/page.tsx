// Invoice Creation Page for Lease
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  PlusIcon,
  MinusIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const STATUS_OPTIONS = [
  { value: 'not_actioned', label: 'Not yet actioned', icon: ClockIcon, color: 'text-muted-foreground/70' },
  { value: 'ready', label: 'Ready to send', icon: CheckCircleIcon, color: 'text-green-500' },
  { value: 'waiting_expenses', label: 'Waiting for expenses', icon: CogIcon, color: 'text-yellow-400' },
  { value: 'urgent', label: 'Requires urgent attention', icon: ExclamationTriangleIcon, color: 'text-red-500' },
];

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceCreatePage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Invoice state
  const [title, setTitle] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-001');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10));
  const [status, setStatus] = useState('ready');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [fromDetails, setFromDetails] = useState('Your company details...');
  const [toDetails, setToDetails] = useState('Client details...');
  const [lineItems, setLineItems] = useState([
    { description: 'Item description', category: '', quantity: 1, price: 0, total: 0 },
    { description: 'Item description', category: '', quantity: 1, price: 0, total: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('cs.safarimarker@gmail.com');
  const [bankInfo, setBankInfo] = useState('');
  const [extraNotes, setExtraNotes] = useState('');

  // Line item handlers
  const handleLineChange = (idx: number, field: string, value: any) => {
    setLineItems(items => items.map((item, i) =>
      i === idx ? { ...item, [field]: value, total: field === 'quantity' || field === 'price' ? (field === 'quantity' ? value * item.price : item.quantity * value) : item.quantity * item.price } : item
    ));
  };
  const addLine = () => setLineItems([...lineItems, { description: '', category: '', quantity: 1, price: 0, total: 0 }]);
  const removeLine = (idx: number) => setLineItems(items => items.filter((_, i) => i !== idx));

  // Totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxRate = 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return (
    <DashboardLayout title="Create Invoice">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <input
              className="text-3xl font-bold bg-transparent border-none outline-none text-muted-foreground placeholder-gray-400"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title (Optional)"
            />
          </div>
          <div className="relative">
            <button
              className="flex items-center px-3 py-2 border border-white/20 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20"
              onClick={() => setShowStatusDropdown(v => !v)}
              type="button"
            >
              {STATUS_OPTIONS.find(opt => opt.value === status)?.icon && (
                <span className={`mr-2 ${STATUS_OPTIONS.find(opt => opt.value === status)?.color}`}>
                  {React.createElement(STATUS_OPTIONS.find(opt => opt.value === status)!.icon, { className: 'h-5 w-5' })}
                </span>
              )}
              {STATUS_OPTIONS.find(opt => opt.value === status)?.label}
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                {STATUS_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    className={`flex items-center px-4 py-2 cursor-pointer hover:bg-muted ${status === opt.value ? 'bg-muted' : ''}`}
                    onClick={() => { setStatus(opt.value); setShowStatusDropdown(false); }}
                  >
                    <span className={`mr-2 ${opt.color}`}>{React.createElement(opt.icon, { className: 'h-5 w-5' })}</span>
                    {opt.label}
                  </div>
                ))}
                <div className="border-t border-gray-200">
                  <button className="flex items-center px-4 py-2 w-full text-xs text-blue-500 hover:bg-muted">
                    <CogIcon className="h-4 w-4 mr-2" /> Set default state
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/10 border border-white/20 rounded-lg p-6">
          <div>
            <div className="text-muted-foreground/70 text-sm mb-1">Invoice #</div>
            <input className="bg-transparent border-none outline-none text-blue-400 font-semibold" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <div className="text-muted-foreground/70 text-sm mb-1">Issue Date</div>
            <input type="date" className="bg-transparent border-none outline-none text-white" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          <div>
            <div className="text-muted-foreground/70 text-sm mb-1">Due Date</div>
            <input type="date" className="bg-transparent border-none outline-none text-white" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* From/To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={fromDetails} onChange={e => setFromDetails(e.target.value)} placeholder="Your company details..." />
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={toDetails} onChange={e => setToDetails(e.target.value)} placeholder="Client details..." />
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr className="text-muted-foreground/70 text-sm">
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-center">Quantity</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} className="bg-white/5">
                  <td className="px-4 py-2">
                    <input className="w-full bg-transparent border-none outline-none text-white" value={item.description} onChange={e => handleLineChange(idx, 'description', e.target.value)} placeholder="Item description" />
                  </td>
                  <td className="px-4 py-2">
                    <input className="w-full bg-transparent border-none outline-none text-white" value={item.category} onChange={e => handleLineChange(idx, 'category', e.target.value)} placeholder="Category" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => handleLineChange(idx, 'quantity', Math.max(1, item.quantity - 1))} className="p-1"><MinusIcon className="h-4 w-4 text-muted-foreground/70" /></button>
                      <input type="number" min={1} className="w-12 text-center bg-transparent border-none outline-none text-white" value={item.quantity} onChange={e => handleLineChange(idx, 'quantity', Math.max(1, Number(e.target.value)))} />
                      <button onClick={() => handleLineChange(idx, 'quantity', item.quantity + 1)} className="p-1"><PlusIcon className="h-4 w-4 text-muted-foreground/70" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input type="number" min={0} className="w-20 text-right bg-transparent border-none outline-none text-white" value={item.price} onChange={e => handleLineChange(idx, 'price', Number(e.target.value))} />
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-300"><MinusIcon className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addLine} className="mt-2 flex items-center text-blue-400 hover:text-blue-300 text-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Add line
          </button>
        </div>

        {/* Invoice Actions */}
        <div className="flex flex-wrap gap-2 mt-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add payment</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Add charge</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Issue credit</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Issue refund</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Use deposit</button>
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end space-y-1">
          <div className="flex items-center gap-8">
            <div className="text-muted-foreground/70">Subtotal</div>
            <div className="text-white font-semibold">${formatCurrency(subtotal)}</div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-muted-foreground/70">Tax</div>
            <div className="text-white font-semibold">{taxRate}% ${formatCurrency(tax)}</div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-muted-foreground/70">Subtotal with Tax</div>
            <div className="text-white font-semibold">${formatCurrency(subtotal + tax)}</div>
          </div>
          <div className="flex items-center gap-8 text-lg font-bold border-t border-white/20 pt-2 mt-2">
            <div className="text-white">Total</div>
            <div className="text-white">${formatCurrency(total)}</div>
          </div>
        </div>

        {/* Notes and Delivery */}
        <div className="bg-white/10 border border-white/20 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-muted-foreground/70 text-sm mb-1">Add a note to this invoice (optional)</label>
            <textarea className="w-full bg-transparent border border-white/20 rounded-md p-2 text-white" value={notes} onChange={e => setNotes(e.target.value)} placeholder="No notes have been specified" />
          </div>
          <div>
            <label className="block text-muted-foreground/70 text-sm mb-1">Deliver invoice to</label>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <input className="flex-1 bg-transparent border border-white/20 rounded-md p-2 text-white" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject (optional)" />
              <input className="flex-1 bg-transparent border border-white/20 rounded-md p-2 text-white" value={emailRecipient} onChange={e => setEmailRecipient(e.target.value)} placeholder="CC email" />
            </div>
          </div>
        </div>

        {/* Bank Info and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={bankInfo} onChange={e => setBankInfo(e.target.value)} placeholder="Bank Information" />
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-4 text-white min-h-[80px]" value={extraNotes} onChange={e => setExtraNotes(e.target.value)} placeholder="Notes" />
        </div>
      </div>
    </DashboardLayout>
  );
} 