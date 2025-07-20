/**
 * Reports Dashboard Page
 * Comprehensive reporting interface for property management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Download, 
  Send, 
  Calendar, 
  Archive, 
  Settings, 
  Eye,
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface ReportCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  category: 'financial' | 'lease' | 'tenant' | 'compliance'
  color: string
  lastGenerated?: string
  status: 'ready' | 'generating' | 'error'
}

const ReportsPage = () => {
  const router = useRouter();
  const [reports, setReports] = useState<ReportCard[]>([
    {
      id: '1',
      title: 'Financial Summary',
      description: 'Comprehensive financial overview including income, expenses, and profit analysis',
      icon: <DollarSign className="w-6 h-6" />,
      category: 'financial',
      color: 'bg-blue-600',
      lastGenerated: '2024-01-15T10:30:00Z',
      status: 'ready'
    },
    {
      id: '2',
      title: 'Lease Performance',
      description: 'Analysis of lease agreements, occupancy rates, and rental income trends',
      icon: <Building className="w-6 h-6" />,
      category: 'lease',
      color: 'bg-green-600',
      lastGenerated: '2024-01-14T15:45:00Z',
      status: 'ready'
    },
    {
      id: '3',
      title: 'Tenant Analysis',
      description: 'Detailed tenant demographics, payment history, and satisfaction metrics',
      icon: <Users className="w-6 h-6" />,
      category: 'tenant',
      color: 'bg-purple-600',
      lastGenerated: '2024-01-13T09:20:00Z',
      status: 'ready'
    },
    {
      id: '4',
      title: 'Compliance Report',
      description: 'Regulatory compliance status, safety inspections, and legal requirements',
      icon: <Shield className="w-6 h-6" />,
      category: 'compliance',
      color: 'bg-orange-600',
      lastGenerated: '2024-01-12T14:15:00Z',
      status: 'ready'
    },
    {
      id: '5',
      title: 'Maintenance Overview',
      description: 'Property maintenance status, repair costs, and preventive maintenance schedule',
      icon: <BarChart3 className="w-6 h-6" />,
      category: 'lease',
      color: 'bg-indigo-600',
      lastGenerated: '2024-01-11T11:30:00Z',
      status: 'ready'
    },
    {
      id: '6',
      title: 'Market Analysis',
      description: 'Local market trends, property valuations, and competitive analysis',
      icon: <TrendingUp className="w-6 h-6" />,
      category: 'financial',
      color: 'bg-teal-600',
      lastGenerated: '2024-01-10T16:45:00Z',
      status: 'ready'
    }
  ]);

  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter reports based on selected categories
  const filteredReports = reports.filter(report => 
    selectedReports.length === 0 || selectedReports.includes(report.category)
  );

  const handleGenerateReport = (reportId: string) => {
    setLoading(true);
    // Simulate report generation
    setTimeout(() => {
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: 'ready', lastGenerated: new Date().toISOString() }
          : report
      ));
      setLoading(false);
      
      // Navigate to report preview page
      const report = reports.find(r => r.id === reportId);
      if (report) {
        router.push(`/dashboard/reports/preview?id=${reportId}&type=${report.category}`);
      }
    }, 2000);
  };

  const handleDownloadReport = async (reportId: string, format: 'pdf' | 'excel' | 'csv') => {
    setLoading(true);
    try {
      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Downloading report ${reportId} in ${format} format`);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAllReports = () => {
    console.log('Scheduling all reports');
  };

  const handleEmailReports = () => {
    console.log('Emailing reports');
  };

  const handleExportToAccounting = () => {
    console.log('Exporting to accounting system');
  };

  const handleArchiveReports = () => {
    console.log('Archiving old reports');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'generating':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      financial: 'bg-blue-100 text-blue-800 border-blue-200',
      lease: 'bg-green-100 text-green-800 border-green-200',
      tenant: 'bg-purple-100 text-purple-800 border-purple-200',
      compliance: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[category as keyof typeof colors] || 'bg-muted/20 text-muted-foreground border-border/30'
  };

  return (
    <DashboardLayout title="Reports">
      <div className="p-6">
        {/* Quick Actions Toolbar */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleScheduleAllReports}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule All
                </button>
                <button
                  onClick={handleEmailReports}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Email Reports
                </button>
                <button
                  onClick={handleExportToAccounting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export to Accounting
                </button>
                <button
                  onClick={handleArchiveReports}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive Old
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Filter Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {['financial', 'lease', 'tenant', 'compliance'].map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedReports(prev => 
                        prev.includes(category) 
                          ? prev.filter(c => c !== category)
                          : [...prev, category]
                      )
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedReports.includes(category)
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Custom Report</label>
              <button
                onClick={() => setShowCustomBuilder(!showCustomBuilder)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Custom Report Builder
              </button>
            </div>
          </div>
        </div>

        {/* Custom Report Builder */}
        {showCustomBuilder && (
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Custom Report Builder</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium text-foreground mb-3">Report Type</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="radio" name="reportType" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Financial Summary</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="reportType" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Property Performance</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="reportType" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Tenant Analysis</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="reportType" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Maintenance Tracking</span>
                  </label>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-foreground mb-3">Include Sections</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Executive Summary</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Charts & Graphs</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Detailed Tables</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Recommendations</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => router.push('/dashboard/reports/preview?id=custom&type=financial')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview Report
              </button>
              <button 
                onClick={() => router.push('/dashboard/reports/preview?id=custom&type=financial')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Generate Report
              </button>
            </div>
          </div>
        )}

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 hover:bg-card/90 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${report.color} text-white`}>
                  {report.icon}
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(report.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(report.category)}`}>
                    {report.category}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">{report.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{report.description}</p>
              
              {report.lastGenerated && (
                <p className="text-xs text-muted-foreground mb-4">
                  Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                </p>
              )}
              
              <div className="flex flex-col gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleGenerateReport(report.id)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Generate
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/reports/preview?id=${report.id}&type=${report.category}`)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDownloadReport(report.id, 'pdf')}
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleDownloadReport(report.id, 'excel')}
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => handleDownloadReport(report.id, 'csv')}
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center"
                  >
                    CSV
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No reports found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or create a custom report</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage; 