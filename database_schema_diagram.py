#!/usr/bin/env python3
"""
Database Schema Visualizer
Generates an Entity Relationship Diagram (ERD) for the Property Management System
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, ConnectionPatch
import numpy as np
from typing import Dict, List, Tuple
import math

# Set up the plotting style
plt.style.use('default')
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 8
plt.rcParams['figure.figsize'] = (20, 16)
plt.rcParams['figure.dpi'] = 300

class DatabaseSchemaVisualizer:
    def __init__(self):
        self.fig, self.ax = plt.subplots(1, 1, figsize=(20, 16))
        self.ax.set_xlim(0, 100)
        self.ax.set_ylim(0, 100)
        self.ax.axis('off')
        
        # Color scheme
        self.colors = {
            'primary': '#2563eb',      # Blue for main entities
            'secondary': '#7c3aed',    # Purple for related entities
            'finance': '#059669',      # Green for financial entities
            'payment': '#dc2626',      # Red for payment entities
            'user': '#ea580c',         # Orange for user-related
            'property': '#0891b2',     # Cyan for property-related
            'tenant': '#be185d',       # Pink for tenant-related
            'background': '#f8fafc',   # Light gray background
            'border': '#e2e8f0',       # Border color
            'text': '#1e293b',         # Dark text
            'text_light': '#64748b'    # Light text
        }
        
        # Define table positions and relationships
        self.tables = {
            # Core User Tables
            'users_customuser': {
                'pos': (15, 85),
                'color': self.colors['user'],
                'title': 'Users (CustomUser)',
                'fields': ['id', 'email', 'username', 'role', 'phone_number', 'company'],
                'size': (12, 8)
            },
            
            # Property Tables
            'properties_property': {
                'pos': (50, 85),
                'color': self.colors['property'],
                'title': 'Properties',
                'fields': ['id', 'property_code', 'name', 'property_type', 'status', 'parent_property'],
                'size': (12, 8)
            },
            'properties_propertyimage': {
                'pos': (75, 85),
                'color': self.colors['property'],
                'title': 'Property Images',
                'fields': ['id', 'property', 'image_url', 'is_primary'],
                'size': (10, 6)
            },
            'properties_propertydocument': {
                'pos': (75, 75),
                'color': self.colors['property'],
                'title': 'Property Documents',
                'fields': ['id', 'property', 'document_type', 'title'],
                'size': (10, 6)
            },
            
            # Tenant Tables
            'tenants_tenant': {
                'pos': (15, 60),
                'color': self.colors['tenant'],
                'title': 'Tenants',
                'fields': ['id', 'user', 'tenant_code', 'id_number', 'status'],
                'size': (12, 8)
            },
            'tenants_tenantdocument': {
                'pos': (35, 60),
                'color': self.colors['tenant'],
                'title': 'Tenant Documents',
                'fields': ['id', 'tenant', 'document_type', 'name'],
                'size': (10, 6)
            },
            'tenants_tenantcommunication': {
                'pos': (35, 50),
                'color': self.colors['tenant'],
                'title': 'Tenant Communications',
                'fields': ['id', 'tenant', 'type', 'subject'],
                'size': (10, 6)
            },
            'tenants_lease': {
                'pos': (50, 60),
                'color': self.colors['tenant'],
                'title': 'Leases',
                'fields': ['id', 'property', 'tenant', 'start_date', 'end_date', 'status'],
                'size': (12, 8)
            },
            
            # Landlord Tables
            'landlords_landlord': {
                'pos': (15, 40),
                'color': self.colors['user'],
                'title': 'Landlords',
                'fields': ['id', 'name', 'email', 'type', 'status'],
                'size': (12, 8)
            },
            
            # Finance Tables
            'finance_invoice': {
                'pos': (50, 40),
                'color': self.colors['finance'],
                'title': 'Invoices',
                'fields': ['id', 'invoice_number', 'lease', 'status', 'total_amount'],
                'size': (12, 8)
            },
            'finance_invoicelineitem': {
                'pos': (75, 40),
                'color': self.colors['finance'],
                'title': 'Invoice Line Items',
                'fields': ['id', 'invoice', 'description', 'quantity', 'unit_price'],
                'size': (10, 6)
            },
            'finance_invoiceauditlog': {
                'pos': (75, 30),
                'color': self.colors['finance'],
                'title': 'Invoice Audit Log',
                'fields': ['id', 'invoice', 'action', 'user', 'timestamp'],
                'size': (10, 6)
            },
            'finance_invoicetemplate': {
                'pos': (35, 40),
                'color': self.colors['finance'],
                'title': 'Invoice Templates',
                'fields': ['id', 'name', 'created_by'],
                'size': (10, 6)
            },
            'finance_invoicepayment': {
                'pos': (35, 30),
                'color': self.colors['finance'],
                'title': 'Invoice Payments',
                'fields': ['id', 'invoice', 'amount', 'payment_method'],
                'size': (10, 6)
            },
            
            # Payment Tables
            'payments_strike_invoice': {
                'pos': (50, 20),
                'color': self.colors['payment'],
                'title': 'Strike Invoices',
                'fields': ['id', 'tenant', 'amount_zar', 'status'],
                'size': (12, 8)
            },
            'payments_lightning_quote': {
                'pos': (75, 20),
                'color': self.colors['payment'],
                'title': 'Lightning Quotes',
                'fields': ['id', 'strike_invoice', 'btc_amount', 'status'],
                'size': (10, 6)
            },
            'payments_payment_transaction': {
                'pos': (75, 10),
                'color': self.colors['payment'],
                'title': 'Payment Transactions',
                'fields': ['id', 'strike_invoice', 'transaction_hash', 'status'],
                'size': (10, 6)
            },
            'payments_webhook_event': {
                'pos': (35, 20),
                'color': self.colors['payment'],
                'title': 'Webhook Events',
                'fields': ['id', 'event_type', 'event_id', 'processed'],
                'size': (10, 6)
            }
        }
        
        # Define relationships
        self.relationships = [
            # User relationships
            ('users_customuser', 'tenants_tenant', '1:1', 'user'),
            ('users_customuser', 'properties_property', '1:N', 'owner'),
            ('users_customuser', 'properties_property', '1:N', 'property_manager'),
            ('users_customuser', 'finance_invoice', '1:N', 'created_by'),
            ('users_customuser', 'finance_invoice', '1:N', 'landlord'),
            ('users_customuser', 'finance_invoiceauditlog', '1:N', 'user'),
            ('users_customuser', 'finance_invoicetemplate', '1:N', 'created_by'),
            
            # Property relationships
            ('properties_property', 'properties_property', '1:N', 'parent_property'),
            ('properties_property', 'properties_propertyimage', '1:N', 'property'),
            ('properties_property', 'properties_propertydocument', '1:N', 'property'),
            ('properties_property', 'tenants_lease', '1:N', 'property'),
            ('properties_property', 'finance_invoice', '1:N', 'property'),
            
            # Tenant relationships
            ('tenants_tenant', 'tenants_tenantdocument', '1:N', 'tenant'),
            ('tenants_tenant', 'tenants_tenantcommunication', '1:N', 'tenant'),
            ('tenants_tenant', 'tenants_lease', '1:N', 'tenant'),
            ('tenants_tenant', 'payments_strike_invoice', '1:N', 'tenant'),
            
            # Lease relationships
            ('tenants_lease', 'finance_invoice', '1:N', 'lease'),
            ('tenants_lease', 'payments_strike_invoice', '1:N', 'lease'),
            
            # Finance relationships
            ('finance_invoice', 'finance_invoicelineitem', '1:N', 'invoice'),
            ('finance_invoice', 'finance_invoiceauditlog', '1:N', 'invoice'),
            ('finance_invoice', 'finance_invoicepayment', '1:N', 'invoice'),
            ('finance_invoice', 'finance_invoice', '1:N', 'parent_invoice'),
            
            # Payment relationships
            ('payments_strike_invoice', 'payments_lightning_quote', '1:N', 'strike_invoice'),
            ('payments_strike_invoice', 'payments_payment_transaction', '1:1', 'strike_invoice'),
            ('payments_strike_invoice', 'payments_webhook_event', '1:N', 'strike_invoice'),
            ('payments_lightning_quote', 'payments_payment_transaction', '1:1', 'lightning_quote'),
        ]
    
    def draw_table(self, table_name: str, table_info: Dict):
        """Draw a table box with fields"""
        x, y = table_info['pos']
        width, height = table_info['size']
        color = table_info['color']
        
        # Draw table box
        box = FancyBboxPatch(
            (x - width/2, y - height/2), width, height,
            boxstyle="round,pad=0.1",
            facecolor=color,
            edgecolor=self.colors['border'],
            linewidth=2,
            alpha=0.9
        )
        self.ax.add_patch(box)
        
        # Draw title
        self.ax.text(x, y + height/2 - 0.5, table_info['title'], 
                    ha='center', va='center', fontsize=10, fontweight='bold',
                    color='white', bbox=dict(boxstyle="round,pad=0.2", facecolor=color, alpha=0.8))
        
        # Draw fields
        for i, field in enumerate(table_info['fields']):
            field_y = y + height/2 - 1.5 - i * 0.6
            if field_y > y - height/2 + 0.5:  # Only draw if within table bounds
                self.ax.text(x - width/2 + 0.3, field_y, f"• {field}", 
                            ha='left', va='center', fontsize=7, color='white')
    
    def draw_relationship(self, from_table: str, to_table: str, rel_type: str, field: str):
        """Draw a relationship line between tables"""
        if from_table not in self.tables or to_table not in self.tables:
            return
            
        from_pos = self.tables[from_table]['pos']
        to_pos = self.tables[to_table]['pos']
        
        # Calculate line start and end points (edge of table boxes)
        from_size = self.tables[from_table]['size']
        to_size = self.tables[to_table]['size']
        
        # Simple line from center to center for now
        line = ConnectionPatch(
            from_pos, to_pos, "data", "data",
            arrowstyle="->", shrinkA=5, shrinkB=5,
            mutation_scale=20, fc=self.colors['text_light'],
            ec=self.colors['text_light'], linewidth=1.5, alpha=0.7
        )
        self.ax.add_patch(line)
        
        # Add relationship label
        mid_x = (from_pos[0] + to_pos[0]) / 2
        mid_y = (from_pos[1] + to_pos[1]) / 2
        
        # Adjust label position to avoid overlap
        if abs(from_pos[0] - to_pos[0]) > abs(from_pos[1] - to_pos[1]):
            # Horizontal relationship
            label_y = mid_y + 1
        else:
            # Vertical relationship
            label_x = mid_x + 1
            label_y = mid_y
        
        self.ax.text(mid_x, mid_y, f"{rel_type}\n{field}", 
                    ha='center', va='center', fontsize=6, 
                    color=self.colors['text'], 
                    bbox=dict(boxstyle="round,pad=0.2", facecolor='white', alpha=0.8))
    
    def draw_legend(self):
        """Draw a legend explaining the diagram"""
        legend_items = [
            ('Primary Entities', self.colors['primary']),
            ('Property Related', self.colors['property']),
            ('Tenant Related', self.colors['tenant']),
            ('User Related', self.colors['user']),
            ('Financial', self.colors['finance']),
            ('Payment/Bitcoin', self.colors['payment'])
        ]
        
        legend_x = 85
        legend_y = 95
        
        for i, (label, color) in enumerate(legend_items):
            y_pos = legend_y - i * 2
            # Draw color box
            box = patches.Rectangle((legend_x, y_pos - 0.3), 1, 0.6, 
                                  facecolor=color, edgecolor=self.colors['border'])
            self.ax.add_patch(box)
            # Draw label
            self.ax.text(legend_x + 1.5, y_pos, label, ha='left', va='center', 
                        fontsize=8, fontweight='bold', color=self.colors['text'])
    
    def draw_title(self):
        """Draw the diagram title"""
        self.ax.text(50, 98, 'Property Management System - Database Schema', 
                    ha='center', va='center', fontsize=16, fontweight='bold',
                    color=self.colors['text'])
        self.ax.text(50, 96, 'Entity Relationship Diagram (ERD)', 
                    ha='center', va='center', fontsize=12, 
                    color=self.colors['text_light'])
    
    def generate_diagram(self):
        """Generate the complete ERD"""
        # Set background
        self.ax.set_facecolor(self.colors['background'])
        
        # Draw title
        self.draw_title()
        
        # Draw all tables
        for table_name, table_info in self.tables.items():
            self.draw_table(table_name, table_info)
        
        # Draw all relationships
        for from_table, to_table, rel_type, field in self.relationships:
            self.draw_relationship(from_table, to_table, rel_type, field)
        
        # Draw legend
        self.draw_legend()
        
        # Add some helpful text
        self.ax.text(5, 5, 'Note: This diagram shows the main entities and their relationships.\n'
                           'Foreign keys are indicated by relationship lines.', 
                    ha='left', va='bottom', fontsize=8, 
                    color=self.colors['text_light'],
                    bbox=dict(boxstyle="round,pad=0.5", facecolor='white', alpha=0.8))
        
        plt.tight_layout()
        return self.fig

def main():
    """Generate and save the database schema diagram"""
    visualizer = DatabaseSchemaVisualizer()
    fig = visualizer.generate_diagram()
    
    # Save the diagram
    fig.savefig('database_schema_erd.png', dpi=300, bbox_inches='tight', 
                facecolor=visualizer.colors['background'])
    fig.savefig('database_schema_erd.pdf', bbox_inches='tight', 
                facecolor=visualizer.colors['background'])
    
    print("✅ Database schema diagram generated successfully!")
    print("📁 Files created:")
    print("   - database_schema_erd.png (high-resolution PNG)")
    print("   - database_schema_erd.pdf (vector PDF)")
    print("\n🎨 The diagram shows:")
    print("   - 18 main database tables")
    print("   - Color-coded by category (Users, Properties, Tenants, Finance, Payments)")
    print("   - Relationship lines with cardinality")
    print("   - Key fields for each table")
    
    plt.show()

if __name__ == "__main__":
    main() 