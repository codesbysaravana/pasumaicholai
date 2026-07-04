#!/bin/bash

# Configuration
BASE_URL="http://localhost:5000"
API_V1="/api/v1"

echo "Testing PASUMAI CHOLAI Backend..."
echo "--------------------------------"

# 1. Root Endpoint
echo "1. Testing Root Endpoint..."
curl -s "$BASE_URL/" | grep -q "PASUMAI CHOLAI API is running" && echo "✅ Root endpoint OK" || echo "❌ Root endpoint FAILED"

# 2. Health Endpoint
echo "2. Testing Health Endpoint..."
curl -s "$BASE_URL/health" | grep -q "Server is healthy" && echo "✅ Health endpoint OK" || echo "❌ Health endpoint FAILED"

# 3. Marketplace Listings (Public)
echo "3. Testing Marketplace Listings (Public)..."
RESPONSE=$(curl -s "$BASE_URL$API_V1/marketplace/listings")
if [[ $RESPONSE == *"status"* ]] || [[ $RESPONSE == *"["* ]]; then
  echo "✅ Marketplace Listings OK"
else
  echo "❌ Marketplace Listings FAILED"
  echo "Response: $RESPONSE"
fi

echo "--------------------------------"
echo "Tests completed."
