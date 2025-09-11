import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Type definitions for our data structures
interface FinancialSummary {
  total_rental_income: number;
  total_outstanding: number;
  collection_rate: number;
  deposits_held: number;
  payments_due_landlords: number;
  payments_due_suppliers: number;
  monthly_revenue: number;
  monthly_expenses: number;
  net_profit: number;
  cash_flow: number;
}

interface RentalOutstanding {
  id: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  amount_due: number;
  days_overdue: number;
  last_payment_date: string;
  status: 'current' | 'late' | 'overdue' | 'delinquent';
}

interface Payment {
  id: string;
  type: 'rental' | 'deposit' | 'fee' | 'maintenance';
  tenant_name?: string;
  property_name: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  payment_method: string;
  reference?: string;
}

interface LandlordPayment {
  id: string;
  landlord_name: string;
  property_name: string;
  amount_due: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  rent_collected: number;
  management_fee: number;
  expenses: number;
  contact_email?: string;
  contact_phone?: string;
}

interface SupplierPayment {
  id: string;
  supplier_name: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  category: string;
  invoice_number?: string;
  contact_person?: string;
  contact_phone?: string;
}

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('ZAR', 'R');
};

// Utility function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to handle errors
const handleExportError = (error: any, exportType: string) => {
  console.error(`Error generating ${exportType}:`, error);
  alert(`Failed to generate ${exportType}. Please check the console for details.`);
};

// PDF Generation Functions
export const generateFinancialOverviewPDF = (
  financialSummary: FinancialSummary,
  rentalOutstanding: RentalOutstanding[],
  recentPayments: Payment[]
) => {
  try {
    console.log('Starting Financial Overview PDF generation...');
    console.log('Data received:', { financialSummary, rentalOutstanding: rentalOutstanding.length, recentPayments: recentPayments.length });
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Overview Report', 20, 30);
    
    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Financial Summary Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 20, 65);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let yPos = 80;
    
    const summaryData = [
      ['Monthly Revenue', formatCurrency(financialSummary.monthly_revenue)],
      ['Monthly Expenses', formatCurrency(financialSummary.monthly_expenses)],
      ['Net Profit', formatCurrency(financialSummary.net_profit)],
      ['Cash Flow', formatCurrency(financialSummary.cash_flow)],
      ['Outstanding Rent', formatCurrency(financialSummary.total_outstanding)],
      ['Collection Rate', `${financialSummary.collection_rate}%`],
      ['Deposits Held', formatCurrency(financialSummary.deposits_held)],
    ];
    
    summaryData.forEach(([label, value]) => {
      doc.text(label + ':', 25, yPos);
      doc.text(value, 120, yPos);
      yPos += 12;
    });
    
    // Outstanding Rentals Section
    yPos += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Outstanding Rentals', 20, yPos);
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Tenant', 25, yPos);
    doc.text('Property', 75, yPos);
    doc.text('Amount Due', 125, yPos);
    doc.text('Days Overdue', 165, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    
    rentalOutstanding.slice(0, 10).forEach((rental) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.text(rental.tenant_name.substring(0, 15), 25, yPos);
      doc.text(rental.property_name.substring(0, 15), 75, yPos);
      doc.text(formatCurrency(rental.amount_due), 125, yPos);
      doc.text(`${rental.days_overdue} days`, 165, yPos);
      yPos += 10;
    });
    
    // Recent Payments Section
    if (yPos > 200) {
      doc.addPage();
      yPos = 30;
    } else {
      yPos += 15;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Payments', 20, yPos);
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 25, yPos);
    doc.text('Tenant', 60, yPos);
    doc.text('Property', 100, yPos);
    doc.text('Amount', 140, yPos);
    doc.text('Status', 170, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    
    recentPayments.slice(0, 10).forEach((payment) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.text(formatDate(payment.date), 25, yPos);
      doc.text((payment.tenant_name || '').substring(0, 12), 60, yPos);
      doc.text(payment.property_name.substring(0, 12), 100, yPos);
      doc.text(formatCurrency(payment.amount), 140, yPos);
      doc.text(payment.status, 170, yPos);
      yPos += 10;
    });
    
    console.log('PDF generated successfully, attempting to save...');
    
    // Save the PDF
    doc.save('financial-overview-report.pdf');
    
    console.log('PDF save command executed');
    
  } catch (error) {
    handleExportError(error, 'Financial Overview PDF');
  }
};

export const generateIncomeReportPDF = (rentalOutstanding: RentalOutstanding[]) => {
  try {
    console.log('Starting Income Report PDF generation...');
    console.log('Rental Outstanding data:', rentalOutstanding.length, 'records');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Income Report', 20, 30);
    
    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Outstanding Rentals Table
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Outstanding Rentals', 20, 65);
    
    let yPos = 80;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Table headers
    doc.text('Tenant Name', 20, yPos);
    doc.text('Property', 70, yPos);
    doc.text('Unit', 120, yPos);
    doc.text('Amount Due', 140, yPos);
    doc.text('Days Overdue', 170, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    
    let totalOutstanding = 0;
    
    rentalOutstanding.forEach((rental) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.text(rental.tenant_name, 20, yPos);
      doc.text(rental.property_name.substring(0, 20), 70, yPos);
      doc.text(rental.unit_number, 120, yPos);
      doc.text(formatCurrency(rental.amount_due), 140, yPos);
      doc.text(`${rental.days_overdue}`, 170, yPos);
      
      totalOutstanding += rental.amount_due;
      yPos += 10;
    });
    
    // Total
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Outstanding:', 120, yPos);
    doc.text(formatCurrency(totalOutstanding), 170, yPos);
    
    console.log('Income Report PDF generated successfully, attempting to save...');
    doc.save('income-report.pdf');
    console.log('Income Report PDF save command executed');
    
  } catch (error) {
    handleExportError(error, 'Income Report PDF');
  }
};

export const generateExpenseReportPDF = (payments: Payment[]) => {
  try {
    console.log('Starting Expense Report PDF generation...');
    console.log('Payments data:', payments.length, 'records');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Expense Report', 20, 30);
    
    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Payments Table
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Payments', 20, 65);
    
    let yPos = 80;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Table headers
    doc.text('Date', 20, yPos);
    doc.text('Tenant', 50, yPos);
    doc.text('Property', 90, yPos);
    doc.text('Amount', 130, yPos);
    doc.text('Method', 160, yPos);
    doc.text('Status', 185, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    
    let totalAmount = 0;
    
    payments.forEach((payment) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.text(formatDate(payment.date), 20, yPos);
      doc.text((payment.tenant_name || '').substring(0, 12), 50, yPos);
      doc.text(payment.property_name.substring(0, 12), 90, yPos);
      doc.text(formatCurrency(payment.amount), 130, yPos);
      doc.text(payment.payment_method.substring(0, 8), 160, yPos);
      doc.text(payment.status, 185, yPos);
      
      totalAmount += payment.amount;
      yPos += 10;
    });
    
    // Total
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 130, yPos);
    doc.text(formatCurrency(totalAmount), 170, yPos);
    
    console.log('Expense Report PDF generated successfully, attempting to save...');
    doc.save('expense-report.pdf');
    console.log('Expense Report PDF save command executed');
    
  } catch (error) {
    handleExportError(error, 'Expense Report PDF');
  }
};

export const generateLandlordStatementPDF = (landlordPayments: LandlordPayment[]) => {
  try {
    console.log('Starting Landlord Statement PDF generation...');
    console.log('Landlord Payments data:', landlordPayments.length, 'records');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Landlord Payment Statement', 20, 30);
    
    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    let yPos = 65;
    
    landlordPayments.forEach((payment) => {
      if (yPos > 220) {
        doc.addPage();
        yPos = 30;
      }
      
      // Landlord section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${payment.landlord_name}`, 20, yPos);
      
      yPos += 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const statementData = [
        ['Property:', payment.property_name],
        ['Rent Collected:', formatCurrency(payment.rent_collected)],
        ['Management Fee:', formatCurrency(payment.management_fee)],
        ['Expenses:', formatCurrency(payment.expenses)],
        ['Amount Due:', formatCurrency(payment.amount_due)],
        ['Due Date:', formatDate(payment.due_date)],
        ['Status:', payment.status.toUpperCase()],
      ];
      
      statementData.forEach(([label, value]) => {
        doc.text(label, 25, yPos);
        doc.text(value, 100, yPos);
        yPos += 12;
      });
      
      yPos += 15;
      
      // Add a line separator
      doc.line(20, yPos - 10, 190, yPos - 10);
      yPos += 5;
    });
    
    console.log('Landlord Statement PDF generated successfully, attempting to save...');
    doc.save('landlord-payment-statement.pdf');
    console.log('Landlord Statement PDF save command executed');
    
  } catch (error) {
    handleExportError(error, 'Landlord Statement PDF');
  }
};

export const generateSupplierReportPDF = (supplierPayments: SupplierPayment[]) => {
  try {
    console.log('Starting Supplier Report PDF generation...');
    console.log('Supplier Payments data:', supplierPayments.length, 'records');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier Payment Report', 20, 30);
    
    // Date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Supplier Payments Table
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier Invoices', 20, 65);
    
    let yPos = 80;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    // Table headers
    doc.text('Supplier', 20, yPos);
    doc.text('Description', 60, yPos);
    doc.text('Category', 110, yPos);
    doc.text('Amount', 140, yPos);
    doc.text('Due Date', 165, yPos);
    doc.text('Status', 185, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    
    let totalAmount = 0;
    
    supplierPayments.forEach((payment) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
      }
      
      doc.text(payment.supplier_name.substring(0, 15), 20, yPos);
      doc.text(payment.description.substring(0, 20), 60, yPos);
      doc.text(payment.category, 110, yPos);
      doc.text(formatCurrency(payment.amount), 140, yPos);
      doc.text(formatDate(payment.due_date), 165, yPos);
      doc.text(payment.status, 185, yPos);
      
      totalAmount += payment.amount;
      yPos += 10;
    });
    
    // Total
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 110, yPos);
    doc.text(formatCurrency(totalAmount), 165, yPos);
    
    console.log('Supplier Report PDF generated successfully, attempting to save...');
    doc.save('supplier-payment-report.pdf');
    console.log('Supplier Report PDF save command executed');
    
  } catch (error) {
    handleExportError(error, 'Supplier Report PDF');
  }
};

// Excel Generation Functions (with error handling)
export const generateFinancialOverviewXLSX = (
  financialSummary: FinancialSummary,
  rentalOutstanding: RentalOutstanding[],
  recentPayments: Payment[]
) => {
  try {
    console.log('Starting Financial Overview Excel generation...');
    
    const workbook = XLSX.utils.book_new();
    
    // Financial Summary Sheet
    const summaryData = [
      ['Financial Summary', ''],
      ['Generated', new Date().toLocaleDateString()],
      ['', ''],
      ['Monthly Revenue', financialSummary.monthly_revenue],
      ['Monthly Expenses', financialSummary.monthly_expenses],
      ['Net Profit', financialSummary.net_profit],
      ['Cash Flow', financialSummary.cash_flow],
      ['Outstanding Rent', financialSummary.total_outstanding],
      ['Collection Rate', `${financialSummary.collection_rate}%`],
      ['Deposits Held', financialSummary.deposits_held],
      ['Payments Due Landlords', financialSummary.payments_due_landlords],
      ['Payments Due Suppliers', financialSummary.payments_due_suppliers],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Outstanding Rentals Sheet
    const outstandingData = [
      ['Outstanding Rentals', '', '', '', '', ''],
      ['Tenant Name', 'Property Name', 'Unit Number', 'Amount Due', 'Days Overdue', 'Status'],
      ...rentalOutstanding.map(rental => [
        rental.tenant_name,
        rental.property_name,
        rental.unit_number,
        rental.amount_due,
        rental.days_overdue,
        rental.status
      ])
    ];
    
    const outstandingSheet = XLSX.utils.aoa_to_sheet(outstandingData);
    XLSX.utils.book_append_sheet(workbook, outstandingSheet, 'Outstanding Rentals');
    
    // Recent Payments Sheet
    const paymentsData = [
      ['Recent Payments', '', '', '', '', '', ''],
      ['Date', 'Type', 'Tenant Name', 'Property Name', 'Amount', 'Payment Method', 'Status'],
      ...recentPayments.map(payment => [
        payment.date,
        payment.type,
        payment.tenant_name || '',
        payment.property_name,
        payment.amount,
        payment.payment_method,
        payment.status
      ])
    ];
    
    const paymentsSheet = XLSX.utils.aoa_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Recent Payments');
    
    console.log('Financial Overview Excel generated successfully, attempting to save...');
    XLSX.writeFile(workbook, 'financial-overview-report.xlsx');
    console.log('Financial Overview Excel save command executed');
    
  } catch (error) {
    handleExportError(error, 'Financial Overview Excel');
  }
};

export const generateIncomeReportXLSX = (rentalOutstanding: RentalOutstanding[]) => {
  try {
    console.log('Starting Income Report Excel generation...');
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['Income Report', '', '', '', '', ''],
      ['Generated', new Date().toLocaleDateString(), '', '', '', ''],
      ['', '', '', '', '', ''],
      ['Tenant Name', 'Property Name', 'Unit Number', 'Amount Due', 'Days Overdue', 'Status'],
      ...rentalOutstanding.map(rental => [
        rental.tenant_name,
        rental.property_name,
        rental.unit_number,
        rental.amount_due,
        rental.days_overdue,
        rental.status
      ]),
      ['', '', '', '', '', ''],
      ['Total Outstanding', '', '', rentalOutstanding.reduce((sum, r) => sum + r.amount_due, 0), '', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Income Report');
    
    console.log('Income Report Excel generated successfully, attempting to save...');
    XLSX.writeFile(workbook, 'income-report.xlsx');
    console.log('Income Report Excel save command executed');
    
  } catch (error) {
    handleExportError(error, 'Income Report Excel');
  }
};

export const generateExpenseReportXLSX = (payments: Payment[]) => {
  try {
    console.log('Starting Expense Report Excel generation...');
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['Expense Report', '', '', '', '', '', ''],
      ['Generated', new Date().toLocaleDateString(), '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['Date', 'Type', 'Tenant Name', 'Property Name', 'Amount', 'Payment Method', 'Status'],
      ...payments.map(payment => [
        payment.date,
        payment.type,
        payment.tenant_name || '',
        payment.property_name,
        payment.amount,
        payment.payment_method,
        payment.status
      ]),
      ['', '', '', '', '', '', ''],
      ['Total Amount', '', '', '', payments.reduce((sum, p) => sum + p.amount, 0), '', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expense Report');
    
    console.log('Expense Report Excel generated successfully, attempting to save...');
    XLSX.writeFile(workbook, 'expense-report.xlsx');
    console.log('Expense Report Excel save command executed');
    
  } catch (error) {
    handleExportError(error, 'Expense Report Excel');
  }
};

export const generateLandlordStatementXLSX = (landlordPayments: LandlordPayment[]) => {
  try {
    console.log('Starting Landlord Statement Excel generation...');
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['Landlord Payment Statement', '', '', '', '', '', '', ''],
      ['Generated', new Date().toLocaleDateString(), '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Landlord Name', 'Property Name', 'Rent Collected', 'Management Fee', 'Expenses', 'Amount Due', 'Due Date', 'Status'],
      ...landlordPayments.map(payment => [
        payment.landlord_name,
        payment.property_name,
        payment.rent_collected,
        payment.management_fee,
        payment.expenses,
        payment.amount_due,
        payment.due_date,
        payment.status
      ]),
      ['', '', '', '', '', '', '', ''],
      ['Total Due', '', '', '', '', landlordPayments.reduce((sum, p) => sum + p.amount_due, 0), '', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Landlord Payments');
    
    console.log('Landlord Statement Excel generated successfully, attempting to save...');
    XLSX.writeFile(workbook, 'landlord-payment-statement.xlsx');
    console.log('Landlord Statement Excel save command executed');
    
  } catch (error) {
    handleExportError(error, 'Landlord Statement Excel');
  }
};

export const generateSupplierReportXLSX = (supplierPayments: SupplierPayment[]) => {
  try {
    console.log('Starting Supplier Report Excel generation...');
    
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['Supplier Payment Report', '', '', '', '', '', '', ''],
      ['Generated', new Date().toLocaleDateString(), '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['Supplier Name', 'Description', 'Category', 'Amount', 'Due Date', 'Status', 'Invoice Number', 'Contact Person'],
      ...supplierPayments.map(payment => [
        payment.supplier_name,
        payment.description,
        payment.category,
        payment.amount,
        payment.due_date,
        payment.status,
        payment.invoice_number || '',
        payment.contact_person || ''
      ]),
      ['', '', '', '', '', '', '', ''],
      ['Total Amount', '', '', supplierPayments.reduce((sum, p) => sum + p.amount, 0), '', '', '', '']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Supplier Payments');
    
    console.log('Supplier Report Excel generated successfully, attempting to save...');
    XLSX.writeFile(workbook, 'supplier-payment-report.xlsx');
    console.log('Supplier Report Excel save command executed');
    
  } catch (error) {
    handleExportError(error, 'Supplier Report Excel');
  }
}; 

// =============================
// Comprehensive Income Exports
// =============================

// Local types for comprehensive income export
type IncomeBySource = { source: string; amount: number; percentage: number }[];
type IncomeByProperty = { property_name: string; amount: number }[];
type IncomeByPaymentMethod = { method: string; total: number; success_rate: number; count: number }[];
type IncomeTrend = { month: string; total: number }[];

interface IncomeSummaryExport {
  total_monthly_income: number;
  income_growth: number; // percent
  collection_rate: number; // percent
  average_payment_time_days: number; // days
}

interface OutstandingIncomeExport {
  id: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  amount_due: number;
  days_overdue: number;
  status: string;
}

export const generateComprehensiveIncomePDF = (
  summary: IncomeSummaryExport,
  bySource: IncomeBySource,
  byProperty: IncomeByProperty,
  byMethod: IncomeByPaymentMethod,
  trend: IncomeTrend,
  recentPayments: Payment[],
  outstanding: OutstandingIncomeExport[]
) => {
  try {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Comprehensive Income Report', 20, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);

    // Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Income Summary', 20, 65);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let y = 80;
    const lines = [
      ['Total Monthly Income', formatCurrency(summary.total_monthly_income)],
      ['Income Growth', `${summary.income_growth.toFixed(1)}%`],
      ['Collection Rate', `${summary.collection_rate.toFixed(1)}%`],
      ['Average Payment Time', `${summary.average_payment_time_days.toFixed(1)} days`],
    ];
    lines.forEach(([l, v]) => { doc.text(l as string, 25, y); doc.text(v as string, 145, y); y += 10; });

    // Income by Source
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Income by Source', 20, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    bySource.slice(0, 8).forEach((row) => {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.text(`${row.source}`, 25, y);
      doc.text(formatCurrency(row.amount), 120, y);
      doc.text(`${row.percentage.toFixed(1)}%`, 170, y);
      y += 8;
    });

    // New page for property & method
    if (y > 200) { doc.addPage(); y = 30; } else { y += 10; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Top Properties by Income', 20, y);
    y += 10; doc.setFont('helvetica', 'normal');
    byProperty.slice(0, 10).forEach((p) => {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.text(p.property_name.substring(0, 28), 25, y);
      doc.text(formatCurrency(p.amount), 150, y);
      y += 8;
    });

    if (y > 200) { doc.addPage(); y = 30; } else { y += 10; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Payment Methods', 20, y);
    y += 10; doc.setFont('helvetica', 'normal');
    byMethod.forEach((m) => {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.text(`${m.method}`, 25, y);
      doc.text(`Total: ${formatCurrency(m.total)}`, 90, y);
      doc.text(`Success: ${m.success_rate.toFixed(0)}% (${m.count})`, 150, y);
      y += 8;
    });

    // Trend
    if (y > 200) { doc.addPage(); y = 30; } else { y += 10; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Monthly Trend (last 12 months)', 20, y);
    y += 10; doc.setFont('helvetica', 'normal');
    trend.forEach((t) => {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.text(`${t.month}`, 25, y);
      doc.text(formatCurrency(t.total), 120, y);
      y += 8;
    });

    // Recent Payments
    if (y > 200) { doc.addPage(); y = 30; } else { y += 10; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Recent Income', 20, y);
    y += 10; doc.setFont('helvetica', 'normal');
    recentPayments.slice(0, 12).forEach((p) => {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.text(`${formatDate(p.date)}`, 25, y);
      doc.text(`${p.property_name.substring(0, 20)}`, 70, y);
      doc.text(`${p.type}`, 120, y);
      doc.text(formatCurrency(p.amount), 150, y);
      y += 8;
    });

    // Outstanding table
    if (y > 200) { doc.addPage(); y = 30; } else { y += 10; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Outstanding Income', 20, y);
    y += 10; doc.setFont('helvetica', 'normal');
    const totalOutstanding = outstanding.reduce((s, r) => s + r.amount_due, 0);
    outstanding.slice(0, 12).forEach((r) => {
      if (y > 260) { doc.addPage(); y = 30; }
      doc.text(`${r.tenant_name.substring(0, 16)}`, 25, y);
      doc.text(`${r.property_name.substring(0, 16)}`, 80, y);
      doc.text(formatCurrency(r.amount_due), 140, y);
      doc.text(`${r.days_overdue}d`, 180, y);
      y += 8;
    });
    if (y < 270) { y += 6; doc.setFont('helvetica', 'bold'); doc.text(`Total Outstanding: ${formatCurrency(totalOutstanding)}`, 25, y); }

    doc.save('comprehensive-income-report.pdf');
  } catch (error) {
    handleExportError(error, 'Comprehensive Income PDF');
  }
};

export const generateComprehensiveIncomeXLSX = (
  summary: IncomeSummaryExport,
  bySource: IncomeBySource,
  byProperty: IncomeByProperty,
  byMethod: IncomeByPaymentMethod,
  trend: IncomeTrend,
  recentPayments: Payment[],
  outstanding: OutstandingIncomeExport[]
) => {
  try {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Comprehensive Income Summary', ''],
      ['Generated', new Date().toLocaleDateString()],
      ['Total Monthly Income', summary.total_monthly_income],
      ['Income Growth %', summary.income_growth],
      ['Collection Rate %', summary.collection_rate],
      ['Average Payment Time (days)', summary.average_payment_time_days],
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // By source
    const sourceSheet = XLSX.utils.aoa_to_sheet([
      ['Income by Source', '', ''],
      ['Source', 'Amount', 'Percentage'],
      ...bySource.map(s => [s.source, s.amount, s.percentage]),
    ]);
    XLSX.utils.book_append_sheet(wb, sourceSheet, 'By Source');

    // By property
    const propSheet = XLSX.utils.aoa_to_sheet([
      ['Income by Property', ''],
      ['Property', 'Amount'],
      ...byProperty.map(p => [p.property_name, p.amount]),
    ]);
    XLSX.utils.book_append_sheet(wb, propSheet, 'By Property');

    // By method
    const methodSheet = XLSX.utils.aoa_to_sheet([
      ['Payment Methods', '', '', ''],
      ['Method', 'Total', 'Success Rate %', 'Count'],
      ...byMethod.map(m => [m.method, m.total, m.success_rate, m.count]),
    ]);
    XLSX.utils.book_append_sheet(wb, methodSheet, 'By Method');

    // Trend
    const trendSheet = XLSX.utils.aoa_to_sheet([
      ['Monthly Trend', ''],
      ['Month', 'Total'],
      ...trend.map(t => [t.month, t.total]),
    ]);
    XLSX.utils.book_append_sheet(wb, trendSheet, 'Trend');

    // Recent
    const recentSheet = XLSX.utils.aoa_to_sheet([
      ['Recent Income', '', '', '', ''],
      ['Date', 'Property', 'Type', 'Amount', 'Status'],
      ...recentPayments.map(p => [p.date, p.property_name, p.type, p.amount, p.status]),
    ]);
    XLSX.utils.book_append_sheet(wb, recentSheet, 'Recent');

    // Outstanding
    const outSheet = XLSX.utils.aoa_to_sheet([
      ['Outstanding Income', '', '', '', ''],
      ['Tenant', 'Property', 'Unit', 'Amount Due', 'Days Overdue'],
      ...outstanding.map(o => [o.tenant_name, o.property_name, o.unit_number, o.amount_due, o.days_overdue]),
      ['', '', '', outstanding.reduce((s, r) => s + r.amount_due, 0), 'Total'],
    ]);
    XLSX.utils.book_append_sheet(wb, outSheet, 'Outstanding');

    XLSX.writeFile(wb, 'comprehensive-income-report.xlsx');
  } catch (error) {
    handleExportError(error, 'Comprehensive Income Excel');
  }
};