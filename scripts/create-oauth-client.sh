#!/usr/bin/env bash
# Creates a Google OAuth2 web client for n8n Google Sheets access
# Run AFTER: gcloud auth login (with jatin@growthescalators.com)

set -e

export PATH="/Users/jatinagrawal/google-cloud-sdk/bin:$PATH"

PROJECT_ID="clickup-auto-prod-260311"
REDIRECT_URI="https://primary-production-6c6f5.up.railway.app/rest/oauth2-credential/callback"
TEST_USER="jatin@growthescalators.com"

echo "=== Step 1: Set project ==="
gcloud config set project "$PROJECT_ID"

echo ""
echo "=== Step 2: Enable APIs ==="
gcloud services enable sheets.googleapis.com --quiet
gcloud services enable drive.googleapis.com --quiet
gcloud services enable iamcredentials.googleapis.com --quiet
echo "APIs enabled."

echo ""
echo "=== Step 3: Get access token ==="
ACCESS_TOKEN=$(gcloud auth print-access-token)
echo "Token obtained: ${ACCESS_TOKEN:0:20}..."

echo ""
echo "=== Step 4: Configure OAuth consent screen ==="
curl -s -X PATCH \
  "https://oauth2.googleapis.com/v2/projects/$PROJECT_ID/brands/-" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"applicationTitle\": \"GE n8n\",
    \"supportEmail\": \"$TEST_USER\"
  }" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('Consent screen:', d.get('applicationTitle', d))" 2>/dev/null || true

# Use the iap brand approach (works without GCP org setup)
BRAND_RESPONSE=$(curl -s -X GET \
  "https://iap.googleapis.com/v1/projects/$PROJECT_ID/brands" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Existing brands: $(echo $BRAND_RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('brands',[])))" 2>/dev/null)"

echo ""
echo "=== Step 5: Create OAuth2 web client via REST API ==="

# Use the Cloud Resource Manager / Credentials API
CREATE_RESPONSE=$(curl -s -X POST \
  "https://clientauthconfig.googleapis.com/v2/projects/$PROJECT_ID/brands/-/identityAwareProxyClients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\": \"n8n Google Sheets\"}")

CLIENT_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name','').split('/')[-1])" 2>/dev/null)
CLIENT_SECRET=$(echo "$CREATE_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secret',''))" 2>/dev/null)

if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "None" ] && [ "$CLIENT_ID" != "" ]; then
  echo "SUCCESS via IAP clients API"
  echo "Client ID: $CLIENT_ID"
  echo "Client Secret: $CLIENT_SECRET"
else
  echo "IAP approach failed, response: $CREATE_RESPONSE"
  echo ""
  echo "=== Trying Google OAuth2 Credentials API directly ==="

  # Try the newer credentials API
  CREATE_RESPONSE2=$(curl -s -X POST \
    "https://oauth2.googleapis.com/v1/projects/$PROJECT_ID/serviceAccounts" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{}")

  echo "Response: $CREATE_RESPONSE2" | head -c 300
fi

echo ""
echo "=== Step 6: Add test user to consent screen ==="
# This requires the people API or the OAuth2 consent screen API
# For external apps in testing mode, add test user via GCP API
curl -s -X POST \
  "https://oauth2.googleapis.com/v2/projects/$PROJECT_ID/testUsers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userEmails\": [\"$TEST_USER\"]}" 2>/dev/null || true

echo ""
echo "=== SUMMARY ==="
echo "Project: $PROJECT_ID"
echo "Redirect URI to use in n8n: $REDIRECT_URI"
echo ""
echo "If Client ID/Secret not printed above, use the manual approach:"
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "2. Create Credentials → OAuth client ID → Web application"
echo "3. Name: n8n Google Sheets"
echo "4. Authorized redirect URIs: $REDIRECT_URI"
echo "5. Copy the Client ID and Client Secret"
