/**
 * Debtor Detail Page
 * Individual debtor page with debt details, document uploads, and audit trail
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon, 
  DocumentPlusIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authService } from '@/lib/auth';

// Types for debtor details
interface DebtorDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  total_debt: number;
  status: 'active' | 'pending' | 'resolved' | 'escalated';
  last_contact_formatted: string;
  next_action: string;
  assigned_to_name: string;
  created_at_formatted: string;
  notes: string;
  documents: Document[];
  audit_logs: AuditEntry[];
  payments: Payment[];
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
  size: string;
}

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  performedBy: string;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: string;
}



const statusColors = {
  active: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  escalated: 'bg-red-100 text-red-800'
};

export default function DebtorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [debtor, setDebtor] = useState<DebtorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'audit' | 'payments'>('overview');
  const [newNote, setNewNote] = useState('');
  const [status, setStatus] = useState<string>('active');

  useEffect(() => {
    const fetchDebtorDetail = async () => {
      try {
        setLoading(true);
        const token = authService.getAccessToken();
        if (!token) {
          console.error('No authentication token found');
          setDebtor(null);
          return;
        }
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/debt-management/debtors/${params.id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setDebtor(data);
          setStatus(data.status);
        } else {
          console.error('Error fetching debtor details:', response.status);
          setDebtor(null);
        }
      } catch (error) {
        console.error('Error fetching debtor details:', error);
        setDebtor(null);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchDebtorDetail();
    }
  }, [params.id]);

  if (loading) {
    return (
      <DashboardLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading debtor details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!debtor) {
    return (
      <DashboardLayout title="Debtor Not Found" subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Debtor Not Found</h2>
            <p className="text-gray-500 mb-4">The debtor you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/dashboard/debt-management')}>
              Back to Debt Management
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const token = authService.getAccessToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/debt-management/debtors/${params.id}/update_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        setStatus(newStatus);
      } else {
        console.error('Failed to update status:', response.status);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('Error updating status:', error);
      // TODO: Show error message to user
    }
  };

  const handleAddNote = async () => {
    if (newNote.trim()) {
      try {
        const token = authService.getAccessToken();
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/debt-management/debtors/${params.id}/add_note/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: newNote }),
        });
        
        if (response.ok) {
          setNewNote('');
          // Refresh debtor data to show new note
          window.location.reload();
        } else {
          console.error('Failed to add note:', response.status);
          // TODO: Show error message to user
        }
      } catch (error) {
        console.error('Error adding note:', error);
        // TODO: Show error message to user
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // TODO: Replace with actual API call when backend is ready
        // const formData = new FormData();
        // formData.append('file', file);
        // formData.append('type', 'document');
        // 
        // const response = await fetch(`/api/debt-management/debtors/${params.id}/documents/`, {
        //   method: 'POST',
        //   body: formData,
        // });
        // 
        // if (response.ok) {
        //   // Refresh debtor data to show new document
        //   // fetchDebtorDetail();
        // } else {
        //   throw new Error('Failed to upload document');
        // }
        
        // For now, just log the file
        console.log('File to upload:', file.name);
      } catch (error) {
        console.error('Error uploading file:', error);
        // TODO: Show error message to user
      }
    }
  };

  return (
    <DashboardLayout title={debtor.name} subtitle="Debt Collection Case">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{debtor.name}</h1>
              <p className="text-gray-600">Case ID: {debtor.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status as keyof typeof statusColors]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            <Select 
              value={status} 
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-32"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'documents', name: 'Documents' },
              { id: 'audit', name: 'Audit Trail' },
              { id: 'payments', name: 'Payment History' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Debt Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Debt Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Debt</label>
                      <p className="text-2xl font-bold text-red-600">${debtor.total_debt.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Assigned To</label>
                      <p className="text-lg">{debtor.assigned_to_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Contact</label>
                      <p className="text-lg">{debtor.last_contact_formatted || 'Never'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Next Action</label>
                      <p className="text-lg">{debtor.next_action || 'No action scheduled'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <span>{debtor.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <span>{debtor.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <span>{debtor.address}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{debtor.notes}</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddNote}>Add Note</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Make Phone Call
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <DocumentPlusIcon className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule Follow-up
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(debtor.audit_logs || []).slice(0, 3).map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{entry.action}</p>
                          <p className="text-xs text-gray-500">{entry.timestamp_formatted}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Documents</CardTitle>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload">
                    <Button asChild className="flex items-center gap-2">
                      <span>
                        <DocumentPlusIcon className="h-4 w-4" />
                        Upload Document
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtor.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{doc.type}</TableCell>
                      <TableCell>{doc.uploadedBy}</TableCell>
                      <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{doc.size}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Download</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'audit' && (
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(debtor.audit_logs || []).map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{entry.action}</h4>
                        <span className="text-sm text-gray-500">{entry.timestamp_formatted}</span>
                      </div>
                      <p className="text-gray-600 mt-1">{entry.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>By: {entry.performed_by_name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          entry.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(debtor.payments || []).map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.payment_date_formatted}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ${payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 