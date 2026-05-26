#!/bin/bash

# Affiliate Platform Automation Test Script

echo "🚀 Testing Affiliate Platform Automation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Get JWT token
echo -e "${BLUE}1. Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Check automation status
echo -e "${BLUE}2. Checking automation status...${NC}"
STATUS=$(curl -s http://localhost:4000/automation/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$STATUS" | grep -q "amazon"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Automation endpoints working${NC}"
  echo "$STATUS" | head -100
else
  echo -e "${RED}❌ Status check failed${NC}"
  echo "$STATUS"
fi
echo ""

# 3. View automation logs
echo -e "${BLUE}3. Viewing recent automation logs...${NC}"
LOGS=$(curl -s "http://localhost:4000/automation/logs?limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "$LOGS" | grep -q "items"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Logs retrieved${NC}"
  echo "$LOGS" | head -150
else
  echo -e "${RED}❌ Logs retrieval failed${NC}"
fi
echo ""

# 4. Test product adding (optional - requires Amazon API)
echo -e "${BLUE}4. Testing product addition...${NC}"
read -p "Do you have Amazon API credentials? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Attempting to add product by ASIN B08LGNTQ9M..."

  ADD_RESPONSE=$(curl -s -X POST http://localhost:4000/automation/manual-add-product \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"asin":"B08LGNTQ9M"}')

  echo "$ADD_RESPONSE" | grep -q '"id"'
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Product added successfully${NC}"
    echo "$ADD_RESPONSE" | head -100
  else
    echo -e "${RED}❌ Product addition failed (Amazon API might not be configured)${NC}"
    echo "$ADD_RESPONSE"
  fi
else
  echo "⏭️  Skipped product addition test"
fi
echo ""

echo -e "${GREEN}✅ Testing complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit http://localhost:3002/admin to use the admin dashboard"
echo "2. Get Amazon API credentials from AMAZON_API_SETUP.md"
echo "3. Add to .env: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG"
echo "4. Test product fetching from Amazon"
