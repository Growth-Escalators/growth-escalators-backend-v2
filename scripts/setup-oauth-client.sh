#!/usr/bin/env bash
# Run this script AFTER running: gcloud auth login
# It creates a Google OAuth2 web client for n8n Google Sheets access

set -e
export PATH="/Users/jatinagrawal/google-cloud-sdk/bin:$PATH"

PROJECT_ID="clickup-auto-prod-260311"
REDIRECT_URI="https://primary-production-6c6f5.up.railway.app/rest/oauth2-credential/callback"
APP_NAME="GE n8n"
TEST_USER="jatin@growthescalators.com"

echo ""
echo "=== Step 1: Set project ==="
gcloud config set project "$PROJECT_ID"
echo "Project set: $PROJECT_ID"

echo ""
echo "=== Step 2: Enable APIs ==="
gcloud services enable sheets.googleapis.com --quiet && echo "✓ Sheets API enabled"
gcloud services enable drive.googleapis.com --quiet && echo "✓ Drive API enabled"

echo ""
echo "=== Step 3: Get access token ==="
ACCESS_TOKEN=$(gcloud auth print-access-token)
echo "✓ Token obtained"

echo ""
echo "=== Step 4: Check/create OAuth consent screen brand ==="
BRAND_CHECK=$(curl -s \
  "https://iap.googleapis.com/v1/projects/$PROJECT_ID/brands" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

BRAND_NAME=$(echo "$BRAND_CHECK" | python3 -c "
import sys, json
d = json.load(sys.stdin)
brands = d.get('brands', [])
print(brands[0]['name'] if brands else '')
" 2>/dev/null)

if [ -z "$BRAND_NAME" ]; then
  echo "Creating OAuth consent screen..."
  BRAND_RESP=$(curl -s -X POST \
    "https://iap.googleapis.com/v1/projects/$PROJECT_ID/brands" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"applicationTitle\": \"$APP_NAME\",
      \"supportEmail\": \"$TEST_USER\"
    }")
  BRAND_NAME=$(echo "$BRAND_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null)
  echo "Brand created: $BRAND_NAME"
else
  echo "✓ Existing brand found: $BRAND_NAME"
fi

echo ""
echo "=== Step 5: Create OAuth2 web client ==="
# Use the Cloud OAuth2 credentials API
CREATE_RESP=$(curl -s -X POST \
  "https://oauth2.googleapis.com/v1/projects/$PROJECT_ID/brands/${BRAND_NAME##*/}/identityAwareProxyClients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"displayName\": \"n8n Google Sheets\"}" 2>/dev/null)

CLIENT_ID_FULL=$(echo "$CREATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name',''))" 2>/dev/null)
CLIENT_SECRET=$(echo "$CREATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('secret',''))" 2>/dev/null)

if [ -n "$CLIENT_ID_FULL" ] && [ "$CLIENT_ID_FULL" != "None" ]; then
  # The name format is: projects/PROJECT/brands/BRAND/identityAwareProxyClients/CLIENT_ID
  CLIENT_ID="${CLIENT_ID_FULL##*/}"
  echo "✓ OAuth client created!"
  echo ""
  echo "========================================"
  echo "  CLIENT ID:     $CLIENT_ID"
  echo "  CLIENT SECRET: $CLIENT_SECRET"
  echo "========================================"
else
  echo "IAP approach returned: $CREATE_RESP"
  echo ""
  echo "Trying alternative: Cloud Resource Manager API..."

  # Alternative: use the credentials REST API
  ALT_RESP=$(curl -s -X POST \
    "https://clientauthconfig.googleapis.com/v2/projects/$PROJECT_ID/oauthClients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"displayName\": \"n8n Google Sheets\",
      \"clientType\": \"WEB\",
      \"redirectUris\": [\"$REDIRECT_URI\"]
    }" 2>/dev/null)

  echo "Alt response: $ALT_RESP" | head -c 500
fi

echo ""
echo "=== Step 6: Add test user ==="
curl -s -X POST \
  "https://iap.googleapis.com/v1/$BRAND_NAME:addTestUser" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"emailAddress\": \"$TEST_USER\"}" 2>/dev/null | \
  python3 -c "import sys; print(sys.stdin.read()[:100])" 2>/dev/null || true

echo ""
echo "=== DONE ==="
echo ""
echo "Paste the Client ID and Client Secret above into n8n:"
echo "n8n UI → Credentials → New → Google Sheets OAuth2 API"
echo "  Client ID:     (from above)"
echo "  Client Secret: (from above)"
echo "  OAuth Redirect URL: $REDIRECT_URI"
echo ""
echo "NOTE: Also add this redirect URI in Google Cloud Console:"
echo "  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "  Edit the OAuth client → Add Authorized redirect URI: $REDIRECT_URI"
