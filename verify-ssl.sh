#!/bin/bash

# SSL Verification Script for propman.exceva.capital
# This script verifies the SSL setup and provides detailed diagnostics

echo "🔍 SSL Verification for propman.exceva.capital"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="propman.exceva.capital"

# Function to print test results
print_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name: PASS${NC}"
        [ -n "$details" ] && echo -e "   ${BLUE}$details${NC}"
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}❌ $test_name: FAIL${NC}"
        [ -n "$details" ] && echo -e "   ${RED}$details${NC}"
    else
        echo -e "${YELLOW}⚠️  $test_name: $result${NC}"
        [ -n "$details" ] && echo -e "   ${YELLOW}$details${NC}"
    fi
}

# Test 1: DNS Resolution
echo -e "\n${BLUE}📡 Testing DNS Resolution...${NC}"
DNS_IP=$(dig +short $DOMAIN | tail -n1)
if [ -n "$DNS_IP" ]; then
    print_test_result "DNS Resolution" "PASS" "Domain resolves to: $DNS_IP"
else
    print_test_result "DNS Resolution" "FAIL" "Domain does not resolve"
fi

# Test 2: HTTP to HTTPS Redirect
echo -e "\n${BLUE}🔄 Testing HTTP to HTTPS Redirect...${NC}"
HTTP_CODE=$(curl -s -I -w "%{http_code}" -o /dev/null "http://$DOMAIN" 2>/dev/null)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    REDIRECT_URL=$(curl -s -I "http://$DOMAIN" 2>/dev/null | grep -i location | cut -d' ' -f2 | tr -d '\r\n')
    print_test_result "HTTP Redirect" "PASS" "Redirects to: $REDIRECT_URL"
else
    print_test_result "HTTP Redirect" "FAIL" "HTTP Code: $HTTP_CODE"
fi

# Test 3: HTTPS Connection
echo -e "\n${BLUE}🔒 Testing HTTPS Connection...${NC}"
HTTPS_CODE=$(curl -s -I -w "%{http_code}" -o /dev/null "https://$DOMAIN" 2>/dev/null)
if [ "$HTTPS_CODE" = "200" ]; then
    print_test_result "HTTPS Connection" "PASS" "HTTPS loads successfully"
else
    print_test_result "HTTPS Connection" "FAIL" "HTTPS Code: $HTTPS_CODE"
fi

# Test 4: SSL Certificate Validity
echo -e "\n${BLUE}🔐 Testing SSL Certificate...${NC}"
CERT_CHECK=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ $? -eq 0 ]; then
    CERT_START=$(echo "$CERT_CHECK" | grep notBefore | cut -d= -f2)
    CERT_END=$(echo "$CERT_CHECK" | grep notAfter | cut -d= -f2)
    print_test_result "SSL Certificate" "PASS" "Valid from: $CERT_START to $CERT_END"
else
    print_test_result "SSL Certificate" "FAIL" "Could not verify certificate"
fi

# Test 5: SSL Grade (simplified)
echo -e "\n${BLUE}🏆 Testing SSL Configuration...${NC}"
SSL_PROTOCOL=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | grep "Protocol" | cut -d: -f2 | tr -d ' ')
SSL_CIPHER=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | grep "Cipher" | cut -d: -f2 | tr -d ' ')
if [ -n "$SSL_PROTOCOL" ] && [ -n "$SSL_CIPHER" ]; then
    print_test_result "SSL Configuration" "PASS" "Protocol: $SSL_PROTOCOL, Cipher: $SSL_CIPHER"
else
    print_test_result "SSL Configuration" "UNKNOWN" "Could not determine SSL details"
fi

# Test 6: Security Headers
echo -e "\n${BLUE}🛡️  Testing Security Headers...${NC}"
HEADERS=$(curl -s -I "https://$DOMAIN" 2>/dev/null)

# Check HSTS
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    HSTS_VALUE=$(echo "$HEADERS" | grep -i "strict-transport-security" | cut -d: -f2 | tr -d ' \r\n')
    print_test_result "HSTS Header" "PASS" "$HSTS_VALUE"
else
    print_test_result "HSTS Header" "FAIL" "Missing Strict-Transport-Security header"
fi

# Check X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options"; then
    FRAME_VALUE=$(echo "$HEADERS" | grep -i "x-frame-options" | cut -d: -f2 | tr -d ' \r\n')
    print_test_result "X-Frame-Options" "PASS" "$FRAME_VALUE"
else
    print_test_result "X-Frame-Options" "FAIL" "Missing X-Frame-Options header"
fi

# Check X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    CONTENT_TYPE_VALUE=$(echo "$HEADERS" | grep -i "x-content-type-options" | cut -d: -f2 | tr -d ' \r\n')
    print_test_result "X-Content-Type-Options" "PASS" "$CONTENT_TYPE_VALUE"
else
    print_test_result "X-Content-Type-Options" "FAIL" "Missing X-Content-Type-Options header"
fi

# Test 7: Application Pages
echo -e "\n${BLUE}📄 Testing Application Pages...${NC}"

# Test main page
MAIN_PAGE=$(curl -s -w "%{http_code}" -o /dev/null "https://$DOMAIN" 2>/dev/null)
if [ "$MAIN_PAGE" = "200" ]; then
    print_test_result "Main Page" "PASS" "https://$DOMAIN loads successfully"
else
    print_test_result "Main Page" "FAIL" "Main page returns: $MAIN_PAGE"
fi

# Test login page
LOGIN_PAGE=$(curl -s -w "%{http_code}" -o /dev/null "https://$DOMAIN/auth/login" 2>/dev/null)
if [ "$LOGIN_PAGE" = "200" ]; then
    print_test_result "Login Page" "PASS" "Login page loads successfully"
else
    print_test_result "Login Page" "FAIL" "Login page returns: $LOGIN_PAGE"
fi

# Test API endpoint
API_PAGE=$(curl -s -w "%{http_code}" -o /dev/null "https://$DOMAIN/api/" 2>/dev/null)
if [ "$API_PAGE" = "200" ] || [ "$API_PAGE" = "404" ] || [ "$API_PAGE" = "401" ]; then
    print_test_result "API Endpoint" "PASS" "API endpoint accessible"
else
    print_test_result "API Endpoint" "FAIL" "API endpoint returns: $API_PAGE"
fi

# Test 8: Certificate Expiry Check
echo -e "\n${BLUE}📅 Certificate Expiry Check...${NC}"
if command -v openssl &> /dev/null; then
    CERT_EXPIRY=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$CERT_EXPIRY" ]; then
        # Convert to timestamp for comparison
        EXPIRY_TIMESTAMP=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
        CURRENT_TIMESTAMP=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
        
        if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
            print_test_result "Certificate Expiry" "PASS" "Expires in $DAYS_UNTIL_EXPIRY days ($CERT_EXPIRY)"
        elif [ $DAYS_UNTIL_EXPIRY -gt 0 ]; then
            print_test_result "Certificate Expiry" "WARNING" "Expires in $DAYS_UNTIL_EXPIRY days - renewal needed soon"
        else
            print_test_result "Certificate Expiry" "FAIL" "Certificate expired $DAYS_UNTIL_EXPIRY days ago"
        fi
    else
        print_test_result "Certificate Expiry" "UNKNOWN" "Could not determine expiry date"
    fi
else
    print_test_result "Certificate Expiry" "UNKNOWN" "OpenSSL not available"
fi

# Final Summary
echo -e "\n${BLUE}📊 SSL Verification Summary${NC}"
echo "================================="
echo -e "${GREEN}✅ Tests completed for: $DOMAIN${NC}"
echo ""
echo -e "${YELLOW}🔗 Quick Links:${NC}"
echo "  🏠 Main Site: https://$DOMAIN"
echo "  🔐 Login: https://$DOMAIN/auth/login"
echo "  📝 Register: https://$DOMAIN/auth/register"
echo "  🏢 Dashboard: https://$DOMAIN/dashboard"
echo "  🛠️ Admin: https://$DOMAIN/admin/"
echo ""
echo -e "${YELLOW}🧪 External SSL Tests:${NC}"
echo "  🔍 SSL Labs: https://www.ssllabs.com/ssltest/?d=$DOMAIN"
echo "  🛡️ Security Headers: https://securityheaders.com/?q=https://$DOMAIN"
echo "  📋 SSL Checker: https://www.sslchecker.com/sslchecker.php?hostname=$DOMAIN"
echo ""

# Additional diagnostics if running on server
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${YELLOW}📋 Server-Side Certificate Info:${NC}"
    echo "  Certificate file: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  Private key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    
    # Check certificate details
    CERT_SUBJECT=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -subject 2>/dev/null | cut -d= -f2-)
    CERT_ISSUER=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -issuer 2>/dev/null | cut -d= -f2-)
    
    echo "  Subject: $CERT_SUBJECT"
    echo "  Issuer: $CERT_ISSUER"
    echo ""
fi

echo -e "${GREEN}🎉 SSL verification completed!${NC}" 