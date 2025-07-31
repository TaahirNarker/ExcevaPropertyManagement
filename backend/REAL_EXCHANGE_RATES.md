# Using Real Exchange Rates in Production

This guide explains how to configure the Bitcoin Lightning Payment system to use real exchange rates from the Strike API in production.

## Overview

The system is designed to:

1. **In Production Mode (DEBUG=False)**:
   - Always attempt to use the real Strike API for exchange rates and payment processing
   - Raise errors if the API calls fail (no fallback to mock data)
   - Provide detailed error messages for troubleshooting

2. **In Development Mode (DEBUG=True)**:
   - Attempt to use the real Strike API first
   - Fall back to mock data if API calls fail
   - Use realistic mock exchange rates for testing (650,000 ZAR per BTC)

## Setting Up Production Mode

To enable production mode and use real exchange rates:

1. Run the setup script:
   ```bash
   ./setup_production_env.sh
   ```

   This script will:
   - Set `DEBUG=False` in your `.env` file
   - Configure your Strike API key and webhook secret
   - Set up other production settings

2. Restart your server:
   ```bash
   python3 manage.py runserver 8000
   ```

   For actual production deployment, use a production server like gunicorn:
   ```bash
   gunicorn property_control_system.wsgi:application --bind 0.0.0.0:8000
   ```

## Strike API Configuration

The Strike API requires:

1. **API Key**: Used for authentication
   - Must have the correct permissions (read/write for invoices)
   - Set in `.env` as `STRIKE_API_KEY`

2. **Webhook Secret**: Used for verifying webhook signatures
   - Set in `.env` as `STRIKE_WEBHOOK_SECRET`

3. **Webhook URL**: Set up in your Strike dashboard
   - Should point to: `https://yourdomain.com/api/payments/webhook/strike/`
   - Subscribe to events: `invoice.created` and `invoice.updated`

## Supported Currencies

The Strike API supports the following currencies:

- **BTC** (Bitcoin) - Always supported
- **USDT** (Tether)
- **USD** (US Dollar) - May not be available for all accounts
- **EUR** (Euro) - May not be available for all accounts
- **GBP** (British Pound) - May not be available for all accounts
- **AUD** (Australian Dollar) - May not be available for all accounts

Your account may only support BTC and USDT. The system is configured to use BTC as the primary currency.

## Troubleshooting

If you encounter issues with real exchange rates:

1. **Check API Key Permissions**:
   - Verify your Strike API key has the correct permissions
   - Test the API key using the test script:
     ```bash
     python3 test_strike_api.py
     ```

2. **Check Supported Currencies**:
   - Run the currency check script:
     ```bash
     python3 check_supported_currencies.py
     ```

3. **Check Server Logs**:
   - Look for Strike API error messages in the logs
   - Common errors include 401 (unauthorized) or 404 (endpoint not found)

4. **Test Webhook Setup**:
   - Verify your webhook URL is correctly configured in Strike dashboard
   - Check webhook events are properly subscribed

## Monitoring Exchange Rates

In production mode, the system will:

1. Fetch real-time exchange rates from Strike API
2. Use these rates for all Bitcoin conversions
3. Log the current rates in the server logs

You can monitor the exchange rates by checking the logs:
```bash
tail -f logs/django.log | grep "Current .* rate"
``` 