# Database Schema - Property Management System

## Overview
This document provides a comprehensive overview of the database schema for the Property Management System. The system uses Django ORM with PostgreSQL and includes models for users, properties, tenants, landlords, finance, and payments.

---

## Core Tables

### 1. Users (CustomUser)
**Table**: `users_customuser`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | User ID |
| `password` | CharField(128) | Required | Hashed password |
| `last_login` | DateTimeField | Nullable | Last login timestamp |
| `is_superuser` | BooleanField | Default: False | Superuser status |
| `username` | CharField(150) | Unique | Username |
| `first_name` | CharField(150) | Required | First name |
| `last_name` | CharField(150) | Required | Last name |
| `email` | EmailField | Unique, Required | Email address |
| `is_staff` | BooleanField | Default: False | Staff status |
| `is_active` | BooleanField | Default: True | Active status |
| `date_joined` | DateTimeField | Auto | Registration date |
| `phone_number` | CharField(20) | Optional | Phone number |
| `company` | CharField(255) | Optional | Company name |
| `role` | CharField(50) | Choices, Default: 'basic_user' | User role |
| `is_landlord` | BooleanField | Default: False | Legacy landlord flag |
| `is_tenant` | BooleanField | Default: False | Legacy tenant flag |
| `webauthn_credentials` | TextField | Optional | WebAuthn credentials JSON |
| `webauthn_challenge` | CharField(500) | Optional | WebAuthn challenge |
| `dashboard_preferences` | JSONField | Optional | Dashboard settings |

**Role Choices**: basic_user, tenant, landlord, maintenance_operator, property_administrator, finance_administrator, manager, superuser

---

### 2. Properties
**Table**: `properties_property`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary Key | Property UUID |
| `property_code` | CharField(20) | Unique, Auto | Property code (PRO000001) |
| `name` | CharField(200) | Required | Property name |
| `property_type` | CharField(20) | Choices, Default: 'house' | Property type |
| `description` | TextField | Optional | Property description |
| `street_address` | CharField(255) | Required | Street address |
| `suburb` | CharField(100) | Optional | Suburb/Area |
| `city` | CharField(100) | Required | City |
| `province` | CharField(20) | Choices, Required | Province |
| `postal_code` | CharField(10) | Optional | Postal code |
| `country` | CharField(50) | Default: 'South Africa' | Country |
| `bedrooms` | PositiveIntegerField | 0-20, Optional | Number of bedrooms |
| `bathrooms` | PositiveIntegerField | 0-20, Optional | Number of bathrooms |
| `square_meters` | DecimalField(10,2) | Optional | Property size |
| `parking_spaces` | PositiveIntegerField | 0-50, Optional | Parking spaces |
| `purchase_price` | DecimalField(15,2) | Optional | Purchase price |
| `current_market_value` | DecimalField(15,2) | Optional | Market value |
| `monthly_rental_amount` | DecimalField(10,2) | Optional | Monthly rent |
| `status` | CharField(20) | Choices, Default: 'vacant' | Property status |
| `is_active` | BooleanField | Default: True | Active status |
| `parent_property` | ForeignKey | Self-reference, Optional | Parent property (for sub-properties) |
| `owner` | ForeignKey(User) | Required | Property owner |
| `property_manager` | ForeignKey(User) | Optional | Property manager |
| `features` | JSONField | Default: {} | Property features |
| `primary_image` | URLField | Optional | Primary image URL |
| `images` | JSONField | Default: [] | Image URLs list |
| `documents` | JSONField | Default: [] | Document URLs list |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

**Property Types**: house, flat, apartment, business, retail, office, industrial, commercial, land, other
**Status**: vacant, occupied, maintenance, reserved, sold, inactive
**Provinces**: western_cape, eastern_cape, northern_cape, free_state, kwazulu_natal, north_west, gauteng, mpumalanga, limpopo

---

### 3. Property Images
**Table**: `properties_propertyimage`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Image ID |
| `property` | ForeignKey(Property) | Required | Related property |
| `image_url` | URLField | Required | Image URL |
| `image_file` | ImageField | Optional | Uploaded image file |
| `title` | CharField(200) | Optional | Image title |
| `description` | TextField | Optional | Image description |
| `is_primary` | BooleanField | Default: False | Primary image flag |
| `order` | PositiveIntegerField | Default: 0 | Display order |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

---

### 4. Property Documents
**Table**: `properties_propertydocument`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Document ID |
| `property` | ForeignKey(Property) | Required | Related property |
| `document_type` | CharField(20) | Choices, Required | Document type |
| `title` | CharField(200) | Required | Document title |
| `description` | TextField | Optional | Document description |
| `file_url` | URLField | Optional | Document URL |
| `file_upload` | FileField | Optional | Uploaded file |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |
| `uploaded_by` | ForeignKey(User) | Optional | Uploader |

**Document Types**: deed, lease, insurance, inspection, maintenance, tax, certificate, other

---

### 5. Tenants
**Table**: `tenants_tenant`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Tenant ID |
| `user` | OneToOneField(User) | Required | Associated user |
| `tenant_code` | CharField(20) | Unique, Auto | Tenant code (TEN000001) |
| `id_number` | CharField(20) | Unique, Required | Government ID |
| `date_of_birth` | DateField | Required | Date of birth |
| `phone` | CharField(20) | Required | Phone number |
| `alternative_phone` | CharField(20) | Optional | Alternative phone |
| `email` | EmailField | Required | Email address |
| `alternative_email` | EmailField | Optional | Alternative email |
| `address` | CharField(255) | Required | Address |
| `city` | CharField(100) | Required | City |
| `province` | CharField(100) | Required | Province |
| `postal_code` | CharField(10) | Required | Postal code |
| `employment_status` | CharField(20) | Choices, Required | Employment status |
| `employer_name` | CharField(255) | Optional | Employer name |
| `employer_contact` | CharField(20) | Optional | Employer contact |
| `monthly_income` | DecimalField(10,2) | Optional | Monthly income |
| `emergency_contact_name` | CharField(255) | Required | Emergency contact |
| `emergency_contact_phone` | CharField(20) | Required | Emergency phone |
| `emergency_contact_relationship` | CharField(50) | Required | Relationship |
| `status` | CharField(20) | Choices, Default: 'pending' | Tenant status |
| `notes` | TextField | Optional | Notes |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

**Employment Status**: employed, self_employed, unemployed, retired, student
**Status**: active, inactive, pending

---

### 6. Tenant Documents
**Table**: `tenants_tenantdocument`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Document ID |
| `tenant` | ForeignKey(Tenant) | Required | Related tenant |
| `name` | CharField(255) | Required | Document name |
| `document_type` | CharField(20) | Choices, Required | Document type |
| `file` | FileField | Required | Document file |
| `uploaded_at` | DateTimeField | Auto | Upload timestamp |
| `expires_at` | DateTimeField | Optional | Expiration date |
| `notes` | TextField | Optional | Notes |

**Document Types**: id_document, proof_of_income, bank_statement, employment_letter, reference, other

---

### 7. Tenant Communications
**Table**: `tenants_tenantcommunication`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Communication ID |
| `tenant` | ForeignKey(Tenant) | Required | Related tenant |
| `type` | CharField(20) | Choices, Required | Communication type |
| `subject` | CharField(255) | Required | Subject |
| `content` | TextField | Required | Content |
| `date` | DateTimeField | Default: now | Communication date |
| `created_by` | ForeignKey(User) | Optional | Creator |

**Types**: email, phone, sms, letter, in_person, other

---

### 8. Leases
**Table**: `tenants_lease`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Lease ID |
| `property` | ForeignKey(Property) | Required | Related property |
| `tenant` | ForeignKey(Tenant) | Required | Related tenant |
| `start_date` | DateField | Required | Lease start date |
| `end_date` | DateField | Required | Lease end date |
| `monthly_rent` | DecimalField(10,2) | Required | Monthly rent |
| `deposit_amount` | DecimalField(10,2) | Required | Deposit amount |
| `status` | CharField(20) | Choices, Required | Lease status |
| `terms` | TextField | Optional | Lease terms |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

**Status**: active, expired, terminated, pending

---

### 9. Landlords
**Table**: `landlords_landlord`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary Key | Landlord UUID |
| `name` | CharField(255) | Required | Contact person name |
| `email` | EmailField | Unique, Required | Email address |
| `phone` | CharField(20) | Optional | Phone number |
| `type` | CharField(20) | Choices, Default: 'Individual' | Landlord type |
| `status` | CharField(20) | Choices, Default: 'Active' | Status |
| `company_name` | CharField(255) | Optional | Company/Trust name |
| `vat_number` | CharField(20) | Optional | VAT number |
| `id_number` | CharField(20) | Optional | ID number |
| `tax_number` | CharField(20) | Optional | Tax number |
| `street_address` | CharField(255) | Optional | Street address |
| `address_line_2` | CharField(255) | Optional | Address line 2 |
| `suburb` | CharField(100) | Optional | Suburb |
| `city` | CharField(100) | Optional | City |
| `province` | CharField(20) | Choices, Optional | Province |
| `postal_code` | CharField(10) | Optional | Postal code |
| `country` | CharField(100) | Default: 'South Africa' | Country |
| `bank_name` | CharField(100) | Optional | Bank name |
| `account_number` | CharField(20) | Optional | Account number |
| `branch_code` | CharField(10) | Optional | Branch code |
| `account_type` | CharField(20) | Choices, Optional | Account type |
| `notes` | TextField | Optional | Notes |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

**Types**: Individual, Company, Trust
**Status**: Active, Inactive, Suspended
**Account Types**: current, savings, transmission

---

### 10. Invoices (Finance)
**Table**: `finance_invoice`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Invoice ID |
| `invoice_number` | CharField(50) | Unique, Auto | Invoice number |
| `title` | CharField(200) | Optional | Invoice title |
| `issue_date` | DateField | Optional | Issue date |
| `due_date` | DateField | Required | Due date |
| `status` | CharField(20) | Choices, Default: 'draft' | Invoice status |
| `lease` | ForeignKey(Lease) | Required | Related lease |
| `property` | ForeignKey(Property) | Required | Related property |
| `tenant` | ForeignKey(Tenant) | Required | Related tenant |
| `landlord` | ForeignKey(User) | Optional | Related landlord |
| `created_by` | ForeignKey(User) | Optional | Creator |
| `subtotal` | DecimalField(12,2) | Default: 0.00 | Subtotal |
| `tax_rate` | DecimalField(5,2) | Default: 0.00 | Tax rate |
| `tax_amount` | DecimalField(12,2) | Default: 0.00 | Tax amount |
| `total_amount` | DecimalField(12,2) | Default: 0.00 | Total amount |
| `notes` | TextField | Optional | Notes |
| `email_subject` | CharField(200) | Optional | Email subject |
| `email_recipient` | EmailField | Optional | Email recipient |
| `bank_info` | TextField | Optional | Bank information |
| `extra_notes` | TextField | Optional | Extra notes |
| `is_locked` | BooleanField | Default: False | Locked status |
| `locked_at` | DateTimeField | Optional | Lock timestamp |
| `locked_by` | ForeignKey(User) | Optional | Locker |
| `sent_at` | DateTimeField | Optional | Sent timestamp |
| `sent_by` | ForeignKey(User) | Optional | Sender |
| `invoice_type` | CharField(20) | Choices, Default: 'regular' | Invoice type |
| `parent_invoice` | ForeignKey(Self) | Optional | Parent invoice |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

**Status**: draft, sent, locked, paid, overdue, cancelled
**Invoice Types**: regular, interim, late_fee, credit

---

### 11. Invoice Line Items
**Table**: `finance_invoicelineitem`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Line item ID |
| `invoice` | ForeignKey(Invoice) | Required | Related invoice |
| `description` | CharField(200) | Required | Item description |
| `category` | CharField(100) | Optional | Category |
| `quantity` | DecimalField(10,2) | Default: 1.00 | Quantity |
| `unit_price` | DecimalField(12,2) | Default: 0.00 | Unit price |
| `total` | DecimalField(12,2) | Default: 0.00 | Total amount |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

---

### 12. Invoice Audit Log
**Table**: `finance_invoiceauditlog`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Log ID |
| `invoice` | ForeignKey(Invoice) | Required | Related invoice |
| `action` | CharField(20) | Choices, Required | Action performed |
| `user` | ForeignKey(User) | Required | User who performed action |
| `timestamp` | DateTimeField | Auto | Action timestamp |
| `details` | TextField | Optional | Action details |
| `field_changed` | CharField(100) | Optional | Changed field |
| `old_value` | TextField | Optional | Old value |
| `new_value` | TextField | Optional | New value |
| `invoice_snapshot` | JSONField | Optional | Invoice state snapshot |

**Actions**: created, updated, sent, locked, paid, cancelled, unlocked, line_item_added, line_item_updated, line_item_deleted, payment_recorded

---

### 13. Invoice Templates
**Table**: `finance_invoicetemplate`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Template ID |
| `name` | CharField(100) | Required | Template name |
| `description` | TextField | Optional | Description |
| `created_by` | ForeignKey(User) | Required | Creator |
| `from_details` | TextField | Optional | From details |
| `to_details` | TextField | Optional | To details |
| `default_notes` | TextField | Optional | Default notes |
| `bank_info` | TextField | Optional | Bank information |
| `default_line_items` | JSONField | Default: [] | Default line items |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

---

### 14. Invoice Payments
**Table**: `finance_invoicepayment`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Payment ID |
| `invoice` | ForeignKey(Invoice) | Required | Related invoice |
| `amount` | DecimalField(12,2) | Required | Payment amount |
| `payment_date` | DateField | Required | Payment date |
| `payment_method` | CharField(20) | Choices, Required | Payment method |
| `reference_number` | CharField(100) | Optional | Reference number |
| `notes` | TextField | Optional | Notes |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |

**Payment Methods**: bank_transfer, credit_card, cash, check, other

---

### 15. Strike Invoices (Bitcoin Payments)
**Table**: `payments_strike_invoice`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary Key | Invoice UUID |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |
| `tenant` | ForeignKey(Tenant) | Required | Related tenant |
| `lease` | ForeignKey(Lease) | Optional | Related lease |
| `amount_zar` | DecimalField(10,2) | Required | Amount in ZAR |
| `currency` | CharField(3) | Choices, Default: 'ZAR' | Currency |
| `description` | TextField | Required | Invoice description |
| `invoice_month` | CharField(7) | Required | Invoice month (YYYY-MM) |
| `invoice_year` | IntegerField | Required | Invoice year |
| `strike_invoice_id` | CharField(255) | Unique, Required | Strike invoice ID |
| `strike_payment_request` | TextField | Optional | Lightning payment request |
| `status` | CharField(20) | Choices, Default: 'pending' | Invoice status |
| `payment_url` | URLField | Optional | Payment URL |
| `paid_at` | DateTimeField | Optional | Payment timestamp |
| `expires_at` | DateTimeField | Optional | Expiration timestamp |

**Status**: pending, quote_generated, paid, expired, canceled
**Currency**: ZAR, BTC

---

### 16. Lightning Quotes
**Table**: `payments_lightning_quote`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary Key | Quote UUID |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |
| `strike_invoice` | ForeignKey(StrikeInvoice) | Required | Related invoice |
| `quote_id` | CharField(255) | Unique, Required | Strike quote ID |
| `bolt11` | TextField | Required | Lightning payment request |
| `btc_amount` | DecimalField(16,8) | Required | Amount in BTC |
| `exchange_rate` | DecimalField(20,8) | Required | ZAR to BTC rate |
| `expires_at` | DateTimeField | Required | Expiration timestamp |
| `status` | CharField(20) | Choices, Default: 'active' | Quote status |
| `paid_at` | DateTimeField | Optional | Payment timestamp |

**Status**: active, paid, expired, canceled

---

### 17. Payment Transactions
**Table**: `payments_payment_transaction`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary Key | Transaction UUID |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Update timestamp |
| `strike_invoice` | OneToOneField(StrikeInvoice) | Required | Related invoice |
| `lightning_quote` | ForeignKey(LightningQuote) | Required | Related quote |
| `transaction_hash` | CharField(255) | Unique, Required | Lightning transaction hash |
| `amount_zar` | DecimalField(10,2) | Required | Amount in ZAR |
| `amount_btc` | DecimalField(16,8) | Required | Amount in BTC |
| `strike_payment_id` | CharField(255) | Unique, Required | Strike payment ID |
| `webhook_received_at` | DateTimeField | Required | Webhook timestamp |
| `status` | CharField(20) | Choices, Default: 'pending' | Transaction status |
| `confirmed_at` | DateTimeField | Optional | Confirmation timestamp |

**Status**: pending, confirmed, failed

---

### 18. Webhook Events
**Table**: `payments_webhook_event`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary Key | Event UUID |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `event_type` | CharField(50) | Choices, Required | Event type |
| `event_id` | CharField(255) | Unique, Required | Strike event ID |
| `raw_data` | JSONField | Required | Raw webhook payload |
| `processed` | BooleanField | Default: False | Processing status |
| `processing_error` | TextField | Optional | Processing error |
| `strike_invoice` | ForeignKey(StrikeInvoice) | Optional | Related invoice |

**Event Types**: invoice.created, invoice.updated, invoice.paid, invoice.canceled

---

## Key Relationships

### Property Hierarchy
- **Properties** can have **Sub-Properties** (self-referencing relationship)
- **Parent Properties** → **Sub-Properties** (one-to-many)
- **Sub-Properties** inherit address from **Parent Properties**

### User Relationships
- **Users** can own multiple **Properties** (one-to-many)
- **Users** can manage multiple **Properties** (one-to-many)
- **Users** can be **Tenants** (one-to-one)
- **Users** can be **Landlords** (one-to-many)

### Property Management
- **Properties** have **Leases** (one-to-many)
- **Leases** connect **Properties** to **Tenants** (many-to-many through Lease)
- **Properties** have **Invoices** (one-to-many)
- **Properties** have **Images** and **Documents** (one-to-many)

### Financial Flow
- **Leases** generate **Invoices** (one-to-many)
- **Invoices** have **Line Items** (one-to-many)
- **Invoices** receive **Payments** (one-to-many)
- **Invoices** have **Audit Logs** (one-to-many)

### Bitcoin Payments
- **Tenants** have **Strike Invoices** (one-to-many)
- **Strike Invoices** generate **Lightning Quotes** (one-to-many)
- **Lightning Quotes** create **Payment Transactions** (one-to-one)
- **Webhook Events** track all payment events

---

## Indexes

### Performance Indexes
- `properties_property_code` - Property code lookup
- `properties_status` - Status filtering
- `properties_property_type` - Type filtering
- `properties_city_province` - Location filtering
- `properties_owner` - Owner filtering
- `finance_invoice_status` - Invoice status filtering
- `payments_strike_invoice_status` - Payment status filtering

### Unique Constraints
- Property codes (PRO000001 format)
- Tenant codes (TEN000001 format)
- Invoice numbers (INV-YYYY-NNNNNN format)
- Strike invoice IDs
- Lightning transaction hashes
- Webhook event IDs

---

## Data Integrity

### Foreign Key Constraints
- All relationships use CASCADE or SET_NULL as appropriate
- User deletion cascades to owned properties
- Property deletion cascades to sub-properties
- Lease deletion cascades to invoices

### Validation Rules
- Property square meters must be positive
- Rental amounts cannot be negative
- Bedrooms/bathrooms must be 0-20
- Parking spaces must be 0-50
- VAT numbers must be 10 digits (companies)
- ID numbers must be 13 digits (individuals)
- Postal codes must be numeric

### Business Rules
- One active lease per property at a time
- One invoice per tenant per month (Bitcoin payments)
- Sub-properties inherit parent property address
- Invoice locking prevents further edits
- Payment quotes expire after 15 minutes

---

## Database Configuration

### Recommended Settings
- **Database**: PostgreSQL 13+
- **Encoding**: UTF-8
- **Timezone**: UTC
- **Connection Pooling**: Enabled
- **Backup Strategy**: Daily automated backups
- **Monitoring**: Query performance monitoring

### Migration Strategy
- All schema changes through Django migrations
- Zero-downtime deployments for schema changes
- Data migration scripts for complex changes
- Rollback procedures for failed migrations 