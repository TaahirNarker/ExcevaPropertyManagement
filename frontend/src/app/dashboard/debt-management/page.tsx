/**
 * Debt Management Page
 * Main page for managing debt collection and debtors
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { authService } from '@/lib/auth';

// Types for debt management
interface Debtor {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_debt: number;
  status: 'active' | 'pending' | 'resolved' | 'escalated';
  last_contact_formatted: string;
  next_action: string;
  assigned_to_name: string;
  created_at_formatted: string;
}



const statusColors = {
  active: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  escalated: 'bg-red-100 text-red-800'
};

export default function DebtManagementPage() {
  const router = useRouter();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Fetch debtors from API
  useEffect(() => {
    const fetchDebtors = async () => {
      try {
        setLoading(true);
        const token = authService.getAccessToken();
        if (!token) {
          console.error('No authentication token found');
          setDebtors([]);
          return;
        }
        
        const response = await fetch('http://localhost:8000/api/debt-management/debtors/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setDebtors(data.results || data);
        } else {
          console.error('Error fetching debtors:', response.status);
          setDebtors([]);
        }
      } catch (error) {
        console.error('Error fetching debtors:', error);
        setDebtors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDebtors();
  }, []);

  // Filter and sort debtors
  const filteredDebtors = debtors
    .filter(debtor => {
      const matchesSearch = debtor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           debtor.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || debtor.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'totalDebt':
          return b.total_debt - a.total_debt;
        case 'lastContact':
          return new Date(b.last_contact_formatted).getTime() - new Date(a.last_contact_formatted).getTime();
        default:
          return 0;
      }
    });

  const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.total_debt, 0);
  const activeDebts = debtors.filter(d => d.status === 'active').length;
  const escalatedDebts = debtors.filter(d => d.status === 'escalated').length;

  return (
    <DashboardLayout title="Debt Management" subtitle="Manage debt collection and track debtors">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Debt</p>
                  <p className="text-2xl font-bold text-red-600">${totalDebt.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-yellow-600">{activeDebts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Escalated</p>
                  <p className="text-2xl font-bold text-red-600">{escalatedDebts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Debtors</p>
                  <p className="text-2xl font-bold text-blue-600">{debtors.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Debtors</CardTitle>
                <p className="text-sm text-gray-600">Manage debt collection cases</p>
              </div>
              <Button 
                className="flex items-center gap-2"
                onClick={() => router.push('/dashboard/debt-management/add')}
              >
                <PlusIcon className="h-4 w-4" />
                Add Debtor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search debtors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </Select>
              <Select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="name">Sort by Name</option>
                <option value="totalDebt">Sort by Debt Amount</option>
                <option value="lastContact">Sort by Last Contact</option>
              </Select>
            </div>

            {/* Debtors Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Total Debt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Next Action</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebtors.map((debtor) => (
                    <TableRow 
                      key={debtor.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/dashboard/debt-management/${debtor.id}`)}
                    >
                      <TableCell className="font-medium">{debtor.name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{debtor.email}</div>
                          <div className="text-xs text-gray-500">{debtor.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        ${debtor.total_debt.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[debtor.status]}`}>
                          {debtor.status.charAt(0).toUpperCase() + debtor.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>{debtor.last_contact_formatted || 'Never'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{debtor.next_action}</TableCell>
                      <TableCell className="text-sm">{debtor.assigned_to_name}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/debt-management/${debtor.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading debtors...</p>
              </div>
            ) : filteredDebtors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No debtors found matching your criteria.' 
                    : 'No debtors found. Click "Add Debtor" to create your first debt collection case.'
                  }
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 