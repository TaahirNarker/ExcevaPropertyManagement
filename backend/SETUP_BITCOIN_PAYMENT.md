# Bitcoin Lightning Payment Setup

This guide will help you set up the Bitcoin Lightning payment system for production using Strike API.

## 1. Environment Setup

Run the provided setup script to configure the environment:

```bash
./env_setup.sh
```

This will:
- Create a `.env` file with Strike API credentials
- Configure webhook secrets and URLs
- Set notification email addresses

## 2. Webhook Configuration

The system requires the following webhook events:
- `invoice.created`
- `invoice.updated`

We've already set up these webhooks in Strike. You can verify this by running:

```bash
python3 setup_all_webhooks.py --list
```

## 3. API Permissions

The Strike API key has been configured with these permissions:
- `partner.account.profile.read` - Read public account profile data
- `partner.invoice.read` - Read invoice details
- `partner.invoice.create` - Create invoices for your account
- `partner.invoice.quote.generate` - Generate a quote for an invoice
- `partner.payment.read` - Read payment details
- `partner.invoice.cancel` - Cancel issued invoices
- `partner.rates.ticker` - Read currency exchange rate tickers
- `partner.webhooks.manage` - Manage webhook subscriptions

## 4. Payment Flow

The system works as follows:
1. Manager creates an invoice in ZAR
2. System generates a Bitcoin Lightning payment request
3. Tenant receives a QR code and Lightning invoice
4. Tenant pays with any Lightning wallet
5. Strike API sends webhook notifications
6. System processes the payment and updates records

## 5. Testing the System

You can test the system in two ways:

### Option 1: Using Demo Mode
The system works in demo mode without actual API calls:

1. Navigate to any lease → Financials → Current Invoice
2. Click "Pay with Bitcoin" button
3. System will generate simulated payment data
4. Payment success will be simulated after 30 seconds

### Option 2: Using Real API
To test with the real API:

1. Start the backend server:
   ```bash
   python3 manage.py runserver 8000
   ```

2. Navigate to the frontend (port 3000)
3. Create a test invoice and follow the payment flow
4. Monitor the backend logs for webhook events

## 6. API Key and Webhook Secret

The following credentials are configured:

- **API Key**: 9278E13D7CC18B4B26231FEBC9682326DDCF0907DEA70FE15C71AB53DEE447E3
- **Webhook Secret**: o09OPGB8WSSafDKxdzi6t4j49j0Fs0ezTAenZngk

Both are stored in your `.env` file.

## 7. Troubleshooting

If you encounter issues:

1. Check backend logs for Strike API errors
2. Verify webhook delivery in Strike dashboard
3. Ensure the payment URL is accessible from the internet
4. Test with the debug scripts in this directory

For help with Strike API issues, refer to the [Strike API documentation](https://docs.strike.me/).

## 8. Production Deployment

When deploying to production:

1. Ensure your server's IP is whitelisted in Strike dashboard
2. Configure correct webhook URLs for your production domain
3. Set up proper SSL certificates for secure payment processing
4. Update the `.env` file with production settings 