/**
 * Report Preview Page
 * Shows a preview of a generated report with PDF download functionality
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Download, 
  ArrowLeft, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building, 
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  Share2,
  Eye,
  EyeOff
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
  id: string;
  title: string;
  type: 'financial' | 'lease' | 'tenant' | 'compliance';
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalProperties: number;
    totalTenants: number;
    totalRevenue: number;
    totalExpenses: number;
    occupancyRate: number;
  };
  charts: Array<{
    id: string;
    title: string;
    type: 'bar' | 'line' | 'pie';
    data: any;
  }>;
  tables: Array<{
    id: string;
    title: string;
    headers: string[];
    rows: any[][];
  }>;
}

const ReportPreviewPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id') || '1';
  const reportType = searchParams.get('type') || 'financial';
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  // Mock report data based on type
  const generateMockReport = (type: string): ReportData => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      id: reportId,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
      type: type as any,
      generatedAt: now.toISOString(),
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      },
      summary: {
        totalProperties: 24,
        totalTenants: 18,
        totalRevenue: 125000,
        totalExpenses: 45000,
        occupancyRate: 75
      },
      charts: [
        {
          id: '1',
          title: 'Monthly Revenue Trend',
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Revenue',
              data: [95000, 105000, 115000, 120000, 125000, 130000]
            }]
          }
        },
        {
          id: '2',
          title: 'Property Occupancy',
          type: 'pie',
          data: {
            labels: ['Occupied', 'Vacant', 'Under Maintenance'],
            datasets: [{
              data: [18, 4, 2]
            }]
          }
        }
      ],
      tables: [
        {
          id: '1',
          title: 'Top Performing Properties',
          headers: ['Property', 'Address', 'Revenue', 'Occupancy', 'Status'],
          rows: [
            ['Sunset Apartments', '123 Main St', '$15,000', '100%', 'Active'],
            ['Ocean View Condos', '456 Beach Rd', '$12,500', '95%', 'Active'],
            ['Downtown Lofts', '789 Center Ave', '$11,200', '90%', 'Active'],
            ['Garden Villas', '321 Park Blvd', '$10,800', '85%', 'Active'],
            ['Mountain View', '654 Hill Dr', '$9,500', '80%', 'Active']
          ]
        },
        {
          id: '2',
          title: 'Recent Transactions',
          headers: ['Date', 'Property', 'Tenant', 'Amount', 'Type'],
          rows: [
            ['2024-01-15', 'Sunset Apartments', 'John Smith', '$1,500', 'Rent'],
            ['2024-01-14', 'Ocean View Condos', 'Sarah Johnson', '$1,800', 'Rent'],
            ['2024-01-13', 'Downtown Lofts', 'Mike Wilson', '$1,200', 'Rent'],
            ['2024-01-12', 'Garden Villas', 'Lisa Brown', '$1,600', 'Rent'],
            ['2024-01-11', 'Mountain View', 'David Lee', '$1,300', 'Rent']
          ]
        }
      ]
    };
  };

  useEffect(() => {
    // Simulate loading report data
    setTimeout(() => {
      setReportData(generateMockReport(reportType));
      setLoading(false);
    }, 1000);
  }, [reportId, reportType]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !reportData) return;
    
    setDownloading(true);
    try {
      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.color = 'black';
      tempContainer.style.padding = '40px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(tempContainer);

      // Generate PDF content
      const pdfContent = generatePDFContent(reportData);
      tempContainer.innerHTML = pdfContent;

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Remove temporary container
      document.body.removeChild(tempContainer);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // If content is longer than one page, add new pages
      let heightLeft = imgHeight;
      let position = 0;

      while (heightLeft >= pdfHeight) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Download the PDF
      const fileName = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const generatePDFContent = (data: ReportData): string => {
    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">${data.title}</h1>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">
            Generated on ${new Date(data.generatedAt).toLocaleDateString()} | 
            Period: ${data.dateRange.start} to ${data.dateRange.end}
          </p>
        </div>

        <!-- Executive Summary -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">
            Executive Summary
          </h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Properties</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #2563eb;">${data.summary.totalProperties}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #059669;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Tenants</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #059669;">${data.summary.totalTenants}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #7c3aed;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Revenue</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #7c3aed;">${formatCurrency(data.summary.totalRevenue)}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #ea580c;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Expenses</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #ea580c;">${formatCurrency(data.summary.totalExpenses)}</p>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0d9488; text-align: center;">
            <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Occupancy Rate</h3>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0d9488;">${data.summary.occupancyRate}%</p>
          </div>
        </div>

        <!-- Charts Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">
            Charts & Analytics
          </h2>
          ${data.charts.map(chart => `
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px;">${chart.title}</h3>
              <div style="background: #ffffff; padding: 20px; border-radius: 4px; text-align: center; border: 1px solid #d1d5db;">
                <p style="margin: 0; color: #6b7280; font-style: italic;">Chart visualization: ${chart.type} chart</p>
                <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Data points: ${chart.data.datasets[0].data?.length || chart.data.datasets[0].data.length} values</p>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Tables Section -->
        ${data.tables.map(table => `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">
              ${table.title}
            </h2>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb;">
                <thead>
                  <tr style="background: #f9fafb;">
                    ${table.headers.map(header => `
                      <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">
                        ${header}
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${table.rows.map((row, rowIndex) => `
                    <tr style="${rowIndex % 2 === 0 ? 'background: #ffffff;' : 'background: #f9fafb;'}">
                      ${row.map(cell => `
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                          ${cell}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">Report generated by RentPilot Property Management System</p>
          <p style="margin: 0;">For questions or support, contact your system administrator</p>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    // Implement sharing functionality
    console.log('Sharing report...');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout title="Report Preview">
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading report preview...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!reportData) {
    return (
      <DashboardLayout title="Report Preview">
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Report not found</h3>
            <p className="text-muted-foreground">The requested report could not be loaded</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Report Preview">
      <div className="p-6" ref={reportRef}>
        {/* Header */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{reportData.title}</h1>
                <p className="text-muted-foreground">
                  Generated on {new Date(reportData.generatedAt).toLocaleDateString()} | 
                  Period: {reportData.dateRange.start} to {reportData.dateRange.end}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2"
              >
                {showCharts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showCharts ? 'Hide' : 'Show'} Charts
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Properties</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{reportData.summary.totalProperties}</p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Tenants</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{reportData.summary.totalTenants}</p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(reportData.summary.totalRevenue)}</p>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Expenses</span>
              </div>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatCurrency(reportData.summary.totalExpenses)}</p>
            </div>
            
            <div className="bg-teal-50 dark:bg-teal-950/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Occupancy</span>
              </div>
              <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{reportData.summary.occupancyRate}%</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {showCharts && (
          <div className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Charts & Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reportData.charts.map((chart) => (
                <div key={chart.id} className="bg-muted/20 rounded-lg p-4 border border-border">
                  <h3 className="text-lg font-medium text-foreground mb-4">{chart.title}</h3>
                  <div className="h-64 bg-muted/10 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Chart visualization would appear here</p>
                      <p className="text-xs text-muted-foreground mt-1">Type: {chart.type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tables Section */}
        <div className="space-y-6">
          {reportData.tables.map((table) => (
            <div key={table.id} className="bg-card/80 backdrop-blur-lg rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">{table.title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {table.headers.map((header, index) => (
                        <th key={index} className="text-left p-3 font-medium text-foreground bg-muted/20">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-border/50 hover:bg-muted/20">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="p-3 text-muted-foreground">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Report generated by RentPilot Property Management System</p>
          <p>For questions or support, contact your system administrator</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportPreviewPage; 