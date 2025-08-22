#!/bin/bash

# Script to revert back to the original invoice system
# This restores the original lease page from backup

echo "🔄 Reverting to Original Invoice System..."

# Check if backup exists
if [ ! -f "frontend/src/app/dashboard/leases/[id]/page.tsx.backup" ]; then
    echo "❌ No backup found! Cannot revert."
    echo "   The original file was not backed up."
    exit 1
fi

# Restore from backup
echo "📁 Restoring original lease page from backup..."
cp "frontend/src/app/dashboard/leases/[id]/page.tsx.backup" "frontend/src/app/dashboard/leases/[id]/page.tsx"

echo "✅ Original invoice system restored!"
echo ""
echo "📍 The lease page now uses the original mock data system"
echo "🔄 To switch back to enhanced: bash switch-to-enhanced-invoices.sh"