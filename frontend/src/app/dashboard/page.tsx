/**
 * Dashboard Page - Property Management System
 * Redesigned for efficiency: Grouped sections, compact summaries, collapsible details, and improved readability.
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  BuildingOfficeIcon, 
  UserGroupIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  CogIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth, withAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';

// Updated DashboardMetrics interface (unchanged, but commented for clarity)
interface DashboardMetrics {
  // Financial metrics
  invoicesDue: { count: number; breakdown: { sent: number; readyToSend: number; currentPeriod: number; dismissed: number; }; };
  rentDue: { count: number; breakdown: { collected: number; outstanding: number; }; };
  billsDue: { count: number; breakdown: { toVendors: number; withCashflow: number; }; };
  feesDue: { count: number; breakdown: { dueToYou: number; withCashflow: number; }; };
  payments: { count: number; breakdown: { landlords: number; paymentDue: number; }; };
  // Property & Lease metrics
  properties: { count: number; breakdown: { occupied: number; vacant: number; }; };
  leases: { count: number; breakdown: { active: number; expired: number; }; };
  renewals: { count: number; breakdown: { dueIn: number; days90: number; days60: number; days30: number; }; };
  // Deposit metrics
  depositsDue: { count: number; breakdown: { partialHeld: number; withoutDeposit: number; }; };
  depositsHeld: { count: number; breakdown: { byLandlord: number; byAgent: number; }; };
}

interface RadialProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

// Radial Progress Component (unchanged, but added comments)
// Displays a circular progress indicator for percentages like occupancy rate.
const RadialProgress: React.FC<RadialProgressProps> = ({
  percentage,
  size = 80,  // Smaller default size for compact design
  strokeWidth = 6,
  color = '#3B82F6',
  backgroundColor = '#374151',
  children
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={backgroundColor} strokeWidth={strokeWidth} fill="transparent" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent"
                strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

// Summary Card Component (New: Compact top-level metrics)
// Displays key stats in a small, efficient card format for quick overview.
interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
    color: string;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, onClick }) => (
  <div className="bg-card/80 backdrop-blur-md rounded-lg border border-border p-4 flex items-center space-x-4 cursor-pointer hover:bg-muted/50 transition-all"
       onClick={onClick}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color} bg-opacity-20`}>{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

// Section Card Component (New: Grouped metrics with collapsible breakdown)
// Organizes related metrics into expandable sections for less clutter.
interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children }) => {
  const [isExpanded, setIsExpanded] = useState(true);  // Default to expanded for key info

  return (
    <div className="bg-card/80 backdrop-blur-md rounded-lg border border-border">
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-3">
            {icon}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <ChevronDownIcon className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      {isExpanded && <div className="p-4 border-t border-border">{children}</div>}
    </div>
  );
};

// Breakdown Item Component (New: For listing details in sections)
// Simple row for breakdown items with color indicators.
interface BreakdownItemProps {
  label: string;
  value: number;
  color: string;
}

const BreakdownItem: React.FC<BreakdownItemProps> = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

// Main Dashboard Page Component
function DashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [preferences, setPreferences] = useState({
    showKeyMetrics: true,
    showFinancial: true,
    showProperties: true,
    showOperations: true,
  });
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Fetch dashboard data (unchanged, but added error handling comments)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Simulate API delay (replace with real API call to backend)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data (as before; in production, fetch from /api/dashboard)
        const mockData: DashboardMetrics = {
          invoicesDue: {
            count: 0,
            breakdown: {
              sent: 1,
              readyToSend: 0,
              currentPeriod: 0,
              dismissed: 0
            }
          },
          rentDue: {
            count: 0,
            breakdown: {
              collected: 1,
              outstanding: 0
            }
          },
          billsDue: {
            count: 0,
            breakdown: {
              toVendors: 0,
              withCashflow: 0
            }
          },
          properties: {
            count: 4,
            breakdown: {
              occupied: 1,
              vacant: 3
            }
          },
          leases: {
            count: 1,
            breakdown: {
              active: 1,
              expired: 0
            }
          },
          renewals: {
            count: 0,
            breakdown: {
              dueIn: 0,
              days90: 0,
              days60: 0,
              days30: 0
            }
          },
          depositsDue: {
            count: 0,
            breakdown: {
              partialHeld: 0,
              withoutDeposit: 0
            }
          },
          depositsHeld: {
            count: 1,
            breakdown: {
              byLandlord: 0,
              byAgent: 1
            }
          },
          feesDue: {
            count: 0,
            breakdown: {
              dueToYou: 0,
              withCashflow: 0
            }
          },
          payments: {
            count: 1,
            breakdown: {
              landlords: 1,
              paymentDue: 1
            }
          }
        };
        setDashboardData(mockData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // TODO: Add user notification for fetch errors
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Function to handle preference changes
  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <DashboardLayout title="RentPilot Dashboard">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout title="RentPilot Dashboard">
          <div className="text-center py-20">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Failed to load dashboard</h3>
            <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate key percentages for radials (e.g., occupancy rate)
  const occupancyPercentage = (dashboardData.properties.breakdown.occupied / dashboardData.properties.count) * 100 || 0;
  const renewalUrgency = (dashboardData.renewals.breakdown.days30 / dashboardData.renewals.count) * 100 || 0;

  return (
    <DashboardLayout title="RentPilot Dashboard">
      <div className="p-6 space-y-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <CogIcon className="h-4 w-4" />
            <span>Customize Dashboard</span>
          </button>
        </div>

        {preferences.showKeyMetrics && (
          // Key Metrics Summary (Top Row: Compact and efficient)
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard title="Properties" value={dashboardData.properties.count} icon={<BuildingOfficeIcon className="h-5 w-5 text-blue-400" />} color="text-blue-400" onClick={() => router.push('/dashboard/properties')} />
            <SummaryCard title="Active Leases" value={dashboardData.leases.breakdown.active} icon={<DocumentTextIcon className="h-5 w-5 text-green-400" />} color="text-green-400" onClick={() => router.push('/dashboard/leases')} />
            <SummaryCard title="Rent Due" value={dashboardData.rentDue.count} icon={<BanknotesIcon className="h-5 w-5 text-yellow-400" />} color="text-yellow-400" onClick={() => router.push('/dashboard/finance')} />
            <SummaryCard title="Tasks" value={dashboardData.renewals.count + dashboardData.billsDue.count} icon={<ClipboardDocumentListIcon className="h-5 w-5 text-purple-400" />} color="text-purple-400" onClick={() => router.push('/dashboard/tasks')} />
          </div>
        )}

        {preferences.showFinancial && (
          // Financial Overview Section
          <SectionCard title="Financial Overview" icon={<CurrencyDollarIcon className="h-6 w-6 text-green-400" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Invoices Due ({dashboardData.invoicesDue.count})</h4>
                <BreakdownItem label="Sent" value={dashboardData.invoicesDue.breakdown.sent} color="#06B6D4" />
                <BreakdownItem label="Ready to Send" value={dashboardData.invoicesDue.breakdown.readyToSend} color="#F59E0B" />
                <BreakdownItem label="Dismissed" value={dashboardData.invoicesDue.breakdown.dismissed} color="#EF4444" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Rent Due ({dashboardData.rentDue.count})</h4>
                <BreakdownItem label="Collected" value={dashboardData.rentDue.breakdown.collected} color="#10B981" />
                <BreakdownItem label="Outstanding" value={dashboardData.rentDue.breakdown.outstanding} color="#EF4444" />
              </div>
              {/* Add similar for billsDue, feesDue, payments */}
            </div>
            <button className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm">View Full Report</button>
          </SectionCard>
        )}

        {preferences.showProperties && (
          // Property Management Section
          <SectionCard title="Property & Leases" icon={<BuildingOfficeIcon className="h-6 w-6 text-blue-400" />}>
            <div className="flex items-center space-x-6 mb-4">
              <RadialProgress percentage={occupancyPercentage}>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{occupancyPercentage.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Occupancy</div>
                </div>
              </RadialProgress>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Properties ({dashboardData.properties.count})</h4>
                <BreakdownItem label="Occupied" value={dashboardData.properties.breakdown.occupied} color="#10B981" />
                <BreakdownItem label="Vacant" value={dashboardData.properties.breakdown.vacant} color="#F59E0B" />
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Leases ({dashboardData.leases.count})</h4>
              <BreakdownItem label="Active" value={dashboardData.leases.breakdown.active} color="#10B981" />
              <BreakdownItem label="Expired" value={dashboardData.leases.breakdown.expired} color="#EF4444" />
            </div>
            <button className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm">Manage Properties</button>
          </SectionCard>
        )}

        {preferences.showOperations && (
          // Operations & Tasks Section
          <SectionCard title="Operations & Tasks" icon={<WrenchScrewdriverIcon className="h-6 w-6 text-yellow-400" />}>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Renewals ({dashboardData.renewals.count})</h4>
                <RadialProgress percentage={renewalUrgency} size={60} color="#F59E0B">
                  <div className="text-sm font-bold text-foreground">{renewalUrgency.toFixed(0)}%</div>
                </RadialProgress>
                <BreakdownItem label="Due in 30 Days" value={dashboardData.renewals.breakdown.days30} color="#EF4444" />
                {/* Add other breakdowns */}
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Deposits Due ({dashboardData.depositsDue.count})</h4>
                {/* Breakdown items */}
              </div>
            </div>
            <button className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm">View All Tasks</button>
          </SectionCard>
        )}
      </div>

      {showCustomizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCustomizeModal(false)}>
          <div className="bg-card rounded-lg p-6 max-w-md w-full m-4 border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Customize Dashboard</h3>
              <button onClick={() => setShowCustomizeModal(false)} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.showKeyMetrics}
                  onChange={() => handlePreferenceChange('showKeyMetrics')}
                  className="form-checkbox h-5 w-5 text-blue-600 bg-background border-border rounded"
                />
                <span className="text-muted-foreground">Show Key Metrics Summary</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.showFinancial}
                  onChange={() => handlePreferenceChange('showFinancial')}
                  className="form-checkbox h-5 w-5 text-blue-600 bg-background border-border rounded"
                />
                <span className="text-muted-foreground">Show Financial Overview</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.showProperties}
                  onChange={() => handlePreferenceChange('showProperties')}
                  className="form-checkbox h-5 w-5 text-blue-600 bg-background border-border rounded"
                />
                <span className="text-muted-foreground">Show Property & Leases</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.showOperations}
                  onChange={() => handlePreferenceChange('showOperations')}
                  className="form-checkbox h-5 w-5 text-blue-600 bg-background border-border rounded"
                />
                <span className="text-muted-foreground">Show Operations & Tasks</span>
              </label>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(DashboardPage); 