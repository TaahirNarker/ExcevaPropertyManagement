"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  DocumentTextIcon,
  BanknotesIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserGroupIcon,
  FolderIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

// --- Mock Data Definitions (copy from leases/add/page.tsx and leases/page.tsx) ---

// Lease interface
interface Lease {
  id: string;
  lease_code: string;
  property_name: string;
  property_code: string;
  tenant_name: string;
  tenant_code: string;
  landlord_name: string;
  landlord_code: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  status: string;
  lease_type: string;
  rental_frequency: string;
  created_at: string;
  updated_at: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_expiring_soon: boolean;
}

const mockLeases: Lease[] = [
  // ... (copy the mockLeases array from leases/page.tsx)
  {
    id: '1', lease_code: 'LSE000001', property_name: 'Sunset Apartment 2A', property_code: 'PRO000001', tenant_name: 'John Smith', tenant_code: 'TEN000001', landlord_name: 'Sarah Johnson', landlord_code: 'LAN000001', start_date: '2024-01-01', end_date: '2024-12-31', monthly_rent: 12000, deposit: 24000, status: 'Active', lease_type: 'Fixed', rental_frequency: 'Monthly', created_at: '2023-12-15T10:30:00Z', updated_at: '2023-12-15T10:30:00Z', days_until_expiry: 45, is_expired: false, is_expiring_soon: true,
  },
  {
    id: '2', lease_code: 'LSE000002', property_name: 'Garden Villa 15', property_code: 'PRO000002', tenant_name: 'Michael Chen', tenant_code: 'TEN000002', landlord_name: 'Emma Williams', landlord_code: 'LAN000002', start_date: '2023-06-01', end_date: '2025-05-31', monthly_rent: 18500, deposit: 37000, status: 'Active', lease_type: 'Fixed', rental_frequency: 'Monthly', created_at: '2023-05-20T14:20:00Z', updated_at: '2023-05-20T14:20:00Z', days_until_expiry: 180, is_expired: false, is_expiring_soon: false,
  },
  {
    id: '3', lease_code: 'LSE000003', property_name: 'City Loft 8B', property_code: 'PRO000003', tenant_name: 'Lisa Anderson', tenant_code: 'TEN000003', landlord_name: 'David Thompson', landlord_code: 'LAN000003', start_date: '2023-03-15', end_date: '2024-03-14', monthly_rent: 15000, deposit: 30000, status: 'Expired', lease_type: 'Fixed', rental_frequency: 'Monthly', created_at: '2023-03-01T09:15:00Z', updated_at: '2023-03-01T09:15:00Z', days_until_expiry: -60, is_expired: true, is_expiring_soon: false,
  },
  {
    id: '4', lease_code: 'LSE000004', property_name: 'Beachfront Condo 12', property_code: 'PRO000004', tenant_name: 'Robert Wilson', tenant_code: 'TEN000004', landlord_name: 'Sarah Johnson', landlord_code: 'LAN000001', start_date: '2024-02-01', end_date: '2025-01-31', monthly_rent: 22000, deposit: 44000, status: 'Active', lease_type: 'Fixed', rental_frequency: 'Monthly', created_at: '2024-01-20T16:45:00Z', updated_at: '2024-01-20T16:45:00Z', days_until_expiry: 220, is_expired: false, is_expiring_soon: false,
  },
  {
    id: '5', lease_code: 'LSE000005', property_name: 'Mountain View House', property_code: 'PRO000005', tenant_name: 'Jennifer Davis', tenant_code: 'TEN000005', landlord_name: 'Michael Brown', landlord_code: 'LAN000004', start_date: '2024-01-15', end_date: '2024-07-14', monthly_rent: 9500, deposit: 19000, status: 'Terminated', lease_type: 'Fixed', rental_frequency: 'Monthly', created_at: '2024-01-10T11:30:00Z', updated_at: '2024-01-10T11:30:00Z', days_until_expiry: -30, is_expired: true, is_expiring_soon: false,
  },
  {
    id: '6', lease_code: 'LSE000006', property_name: 'Downtown Studio 3A', property_code: 'PRO000006', tenant_name: 'Alex Johnson', tenant_code: 'TEN000006', landlord_name: 'Emma Williams', landlord_code: 'LAN000002', start_date: '2024-03-01', end_date: '2025-02-28', monthly_rent: 8500, deposit: 17000, status: 'Active', lease_type: 'Month-to-Month', rental_frequency: 'Monthly', created_at: '2024-02-25T13:15:00Z', updated_at: '2024-02-25T13:15:00Z', days_until_expiry: 365, is_expired: false, is_expiring_soon: false,
  },
];

// Mock properties, tenants, landlords (from add/page.tsx)
const mockProperties = [
  { id: '1', name: 'Sunset Apartment 2A', code: 'PRO000001', address: '123 Main St, Cape Town' },
  { id: '2', name: 'Garden Villa 15', code: 'PRO000002', address: '456 Oak Ave, Stellenbosch' },
  { id: '3', name: 'City Loft 8B', code: 'PRO000003', address: '789 High St, Durban' },
  { id: '4', name: 'Beachfront Condo 12', code: 'PRO000004', address: '321 Beach Rd, Port Elizabeth' },
];
const mockTenants = [
  { id: '1', name: 'John Smith', code: 'TEN000001', email: 'john.smith@email.com' },
  { id: '2', name: 'Michael Chen', code: 'TEN000002', email: 'michael.chen@email.com' },
  { id: '3', name: 'Lisa Anderson', code: 'TEN000003', email: 'lisa.anderson@email.com' },
  { id: '4', name: 'Robert Wilson', code: 'TEN000004', email: 'robert.wilson@email.com' },
];
const mockLandlords = [
  { id: '1', name: 'Sarah Johnson', code: 'LAN000001', email: 'sarah@propertyholdings.co.za' },
  { id: '2', name: 'Emma Williams', code: 'LAN000002', email: 'emma@realestate.co.za' },
  { id: '3', name: 'David Thompson', code: 'LAN000003', email: 'david.t@investments.com' },
  { id: '4', name: 'Michael Brown', code: 'LAN000004', email: 'michael.brown@email.com' },
];

// --- Lease Detail Page Component ---

export default function LeaseDetailPage() {
  const router = useRouter();
  // Get lease id from params
  const params = useParams();
  const leaseId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Find the lease by id
  const lease = mockLeases.find((l) => l.id === leaseId);
  // Find related property, landlord, tenant(s)
  const property = mockProperties.find((p) => p.code === lease?.property_code);
  const landlord = mockLandlords.find((l) => l.code === lease?.landlord_code);
  const tenant = mockTenants.find((t) => t.code === lease?.tenant_code);

  // Tab state
  const [activeTab, setActiveTab] = useState("Lease");

  // Handle tab switching
  const handleTabClick = (tab: string) => setActiveTab(tab);

  // Handle actions
  // Use toast.success for action feedback (toast.info does not exist)
  const handleEdit = () => toast.success("Edit lease - feature coming soon");
  const handleExtend = () => toast.success("Extend lease - feature coming soon");
  const handleCancel = () => toast.success("Cancel lease - feature coming soon");

  // If lease not found, show not found message
  if (!lease) {
    return (
      <DashboardLayout title="Lease Not Found" subtitle="">
        <div className="p-8 text-center text-red-400 text-lg font-semibold">Lease not found.</div>
      </DashboardLayout>
    );
  }

  // --- Helper functions for status, expiry, etc. ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500 text-white";
      case "Expired":
        return "bg-red-500 text-white";
      case "Terminated":
        return "bg-gray-400 text-white";
      default:
        return "bg-gray-300 text-gray-800";
    }
  };

  // --- Main Render ---
  return (
    <DashboardLayout
      title={property ? property.name : lease.property_name}
      subtitle={tenant ? tenant.name : lease.tenant_name}
    >
      {/* Back to Leases button styled like dashboard toolbar */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/leases")}
          className="inline-flex items-center px-4 py-2 border border-white/20 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Leases
        </button>
      </div>

      {/* Tabs styled to match dashboard cards */}
      <div className="flex space-x-2 bg-white/10 border border-white/20 rounded-lg p-1 mb-6">
        {[
          { label: "Lease", icon: DocumentTextIcon },
          { label: "Financials", icon: BanknotesIcon },
          { label: "Contacts", icon: UserGroupIcon },
          { label: "Notes", icon: ClipboardDocumentListIcon },
          { label: "Reports", icon: ChartBarIcon },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab.label)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none ${
              activeTab === tab.label
                ? "bg-white/20 text-blue-400"
                : "text-white/70 hover:text-blue-300"
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lease Summary Section - styled to match dashboard table/card look */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 mb-8">
        <div className="bg-white/5 px-6 py-3 border-b border-white/20">
          <div className="text-xs font-medium text-gray-300 uppercase tracking-wider">Lease Summary</div>
        </div>
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status Card */}
          <div className="flex flex-col items-start justify-center">
            <div className="text-xs text-gray-400 mb-1">Status</div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
              {lease.status}
            </div>
            <div className="text-gray-300 text-sm mb-1">
              Expiry in {lease.days_until_expiry > 0 ? `${lease.days_until_expiry} days` : "Expired"}
            </div>
            <div className="text-xs text-gray-400">{lease.start_date} - {lease.end_date}</div>
            <div className="flex space-x-2 mt-4">
              <button onClick={handleEdit} className="text-xs text-blue-400 underline">Edit</button>
              <span className="text-gray-400">|</span>
              <button onClick={handleExtend} className="text-xs text-blue-400 underline">Extend</button>
              <span className="text-gray-400">|</span>
              <button onClick={handleCancel} className="text-xs text-blue-400 underline">Cancel</button>
            </div>
          </div>
          {/* Total Due Card */}
          <div className="flex flex-col items-start justify-center">
            <div className="text-xs text-gray-400 mb-1">Total Due</div>
            <div className="flex items-center text-lg font-semibold text-white mb-2">
              <BanknotesIcon className="h-5 w-5 mr-2 text-blue-400" /> R{(lease.monthly_rent * 1.28).toLocaleString()}
            </div>
            <div className="text-gray-400 text-xs mb-1">Rental: R {lease.monthly_rent.toLocaleString()} monthly</div>
            <div className="text-gray-400 text-xs">Rent due: On the 1st</div>
          </div>
          {/* Deposit Held Card */}
          <div className="flex flex-col items-start justify-center">
            <div className="text-xs text-gray-400 mb-1">Deposit Held</div>
            <div className="flex items-center text-lg font-semibold text-white mb-2">
              <FolderIcon className="h-5 w-5 mr-2 text-purple-400" /> R {lease.deposit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Lease Details Section (Tab Content) */}
      {/* Tab content styled to match dashboard */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6">
        {activeTab === "Lease" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-xs text-gray-400 mb-1">Reference</div>
                <div className="text-lg font-semibold text-white">{lease.lease_code}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Landlord</div>
                <div className="text-blue-300 font-semibold cursor-pointer underline" onClick={() => router.push(`/dashboard/landlord`)}>
                  {landlord ? landlord.name : lease.landlord_name}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Property</div>
                <div className="text-blue-300 font-semibold cursor-pointer underline" onClick={() => router.push(`/dashboard/properties`)}>
                  {property ? property.name : lease.property_name}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Tenants</div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs cursor-pointer" onClick={() => router.push(`/dashboard/tenants`)}>
                    {tenant ? tenant.name : lease.tenant_name}
                  </span>
                </div>
              </div>
            </div>
            {/* Additional lease details can go here */}
          </div>
        )}
        {activeTab === "Financials" && (
          <div className="text-white">Financials tab content (mocked)</div>
        )}
        {activeTab === "Contacts" && (
          <div className="text-white">Contacts tab content (mocked)</div>
        )}
        {activeTab === "Notes" && (
          <div className="text-white">Notes tab content (mocked)</div>
        )}
        {activeTab === "Reports" && (
          <div className="text-white">Reports tab content (mocked)</div>
        )}
      </div>
    </DashboardLayout>
  );
} 