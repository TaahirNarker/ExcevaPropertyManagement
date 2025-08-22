#!/bin/bash

# Script to switch to the enhanced invoice system
# This replaces the original lease page with the enhanced version

echo "🚀 Switching to Enhanced Invoice System..."

# Backup original file
if [ ! -f "frontend/src/app/dashboard/leases/[id]/page.tsx.backup" ]; then
    echo "📁 Backing up original lease page..."
    cp "frontend/src/app/dashboard/leases/[id]/page.tsx" "frontend/src/app/dashboard/leases/[id]/page.tsx.backup"
    echo "✅ Original page backed up to page.tsx.backup"
fi

# Replace with enhanced version
echo "🔄 Switching to enhanced page..."
cp "frontend/src/app/dashboard/leases/[id]/enhanced-page.tsx" "frontend/src/app/dashboard/leases/[id]/page.tsx"

echo "✅ Enhanced invoice system is now active!"
echo ""
echo "🎯 Features now available:"
echo "   • Real backend invoice integration"
echo "   • Month navigation with draft saving"
echo "   • Multi-invoice payment allocation"
echo "   • Tenant credit balance management"
echo "   • Automatic VAT calculations"
echo "   • Rent escalation tracking"
echo "   • Invoice locking and sending"
echo ""
echo "📍 Navigate to: /dashboard/leases/[id] → Financials → Current Invoice"
echo ""
echo "🔄 To revert: bash revert-to-original-invoices.sh"