#!/bin/bash
#
# Health Check APY Musique
# Vérifie l'état de tous les composants d'hébergement
# Usage: ./healthcheck.sh
#

set -o pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="https://lacaveauxinstrum.fr"
API_URL="https://apy-musique.netlify.app/api"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
TIMEOUT=5
TOTAL_CHECKS=0
PASSED_CHECKS=0

echo -e "${BLUE}=== 🏥 Healthcheck APY Musique ===${NC}"
echo "Domain: $DOMAIN"
echo "API: $API_URL"
echo "Time: $(date)"
echo ""

# Fonction de test
test_endpoint() {
  local name="$1"
  local method="${2:-GET}"
  local url="$3"
  local headers="${4:-}"
  local expected_status="${5:-200}"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # Construire la commande curl
  local cmd="curl -s -w '%{http_code}' -X $method"

  if [ -n "$headers" ]; then
    cmd="$cmd $headers"
  fi

  cmd="$cmd --max-time $TIMEOUT '$url' -o /tmp/healthcheck_response.txt"

  # Exécuter
  local response_code=$(eval "$cmd")
  local response_body=$(cat /tmp/healthcheck_response.txt 2>/dev/null || echo "")

  # Vérifier
  if [ "$response_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ $name${NC} ($response_code)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}✗ $name${NC} (expected $expected_status, got $response_code)"
    if [ -n "$response_body" ] && [ ${#response_body} -lt 200 ]; then
      echo "  Response: $response_body"
    fi
    return 1
  fi
}

echo -e "${BLUE}📡 Connectivity${NC}"
test_endpoint "CDN Health" "GET" "$DOMAIN" "" "200"
test_endpoint "Static Files" "GET" "$DOMAIN/index.html" "" "200"
test_endpoint "Admin Page" "GET" "$DOMAIN/admin/" "" "200"

echo ""
echo -e "${BLUE}🔐 Security Headers${NC}"

# Vérifier les headers de sécurité
check_header() {
  local header_name="$1"
  local header_value="$2"
  local expected_value="$3"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  local response=$(curl -s -I "$DOMAIN" | grep -i "^$header_name:" | cut -d' ' -f2-)

  if [ -n "$response" ]; then
    echo -e "${GREEN}✓ $header_name${NC} present"
    if [ -n "$expected_value" ] && ! echo "$response" | grep -q "$expected_value"; then
      echo -e "${YELLOW}  ⚠️  Value might be incorrect: $response${NC}"
    fi
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo -e "${RED}✗ $header_name${NC} missing"
  fi
}

check_header "Strict-Transport-Security" "" "63072000"
check_header "Content-Security-Policy" "" "default-src"
check_header "X-Frame-Options" "" "DENY"
check_header "X-Content-Type-Options" "" "nosniff"

echo ""
echo -e "${BLUE}🚫 Protection Rules${NC}"

# Vérifier que les fichiers sensibles sont cachés
test_endpoint "Hide package.json" "GET" "$DOMAIN/package.json" "" "404"
test_endpoint "Hide node_modules" "GET" "$DOMAIN/node_modules/test.js" "" "404"
test_endpoint "Hide netlify config" "GET" "$DOMAIN/netlify.toml" "" "404"

echo ""
echo -e "${BLUE}⚙️  API Health${NC}"

if [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${YELLOW}⚠️  ADMIN_PASSWORD not set, skipping authentication tests${NC}"
else
  test_endpoint "Auth Check (Valid)" "POST" "$API_URL/auth-check" \
    "-H 'Authorization: Bearer $ADMIN_PASSWORD'" "200"
  test_endpoint "Auth Check (Invalid)" "POST" "$API_URL/auth-check" \
    "-H 'Authorization: Bearer wrong_password'" "401"
fi

echo ""
echo -e "${BLUE}⏱️  Performance${NC}"

# Mesurer la latence
measure_latency() {
  local name="$1"
  local url="$2"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  local time_ms=$(curl -s -o /dev/null -w '%{time_total}' "$url" | awk '{print int($1 * 1000)}')

  if [ "$time_ms" -lt 500 ]; then
    echo -e "${GREEN}✓ $name${NC} ${time_ms}ms (excellent)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  elif [ "$time_ms" -lt 1000 ]; then
    echo -e "${YELLOW}⚠️  $name${NC} ${time_ms}ms (acceptable)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo -e "${RED}✗ $name${NC} ${time_ms}ms (slow)"
  fi
}

measure_latency "Homepage Load" "$DOMAIN"
measure_latency "API Response" "$API_URL/auth-check"

echo ""
echo -e "${BLUE}📊 Cache Validation${NC}"

# Vérifier les en-têtes Cache-Control
check_cache() {
  local url="$1"
  local min_age="$2"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  local cache_control=$(curl -s -I "$url" | grep -i "^cache-control:" | cut -d' ' -f2-)

  if [ -n "$cache_control" ]; then
    echo -e "${GREEN}✓ Cache set for $url${NC}"
    echo "  Cache-Control: $cache_control"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo -e "${RED}✗ No cache header for $url${NC}"
  fi
}

check_cache "$DOMAIN/assets/fonts/ubuntu.woff2" "31536000"
check_cache "$DOMAIN/assets/css/style.css" "0"
check_cache "$DOMAIN/assets/img/hero.jpg" "604800"

echo ""
echo -e "${BLUE}🔍 SSL/TLS${NC}"

# Vérifier le certificat SSL
check_ssl() {
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  local cert_info=$(echo | openssl s_client -servername lacaveauxinstrum.fr \
    -connect lacaveauxinstrum.fr:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

  if [ -n "$cert_info" ]; then
    local expiry=$(echo "$cert_info" | grep "notAfter=" | cut -d= -f2)
    echo -e "${GREEN}✓ SSL Certificate Valid${NC}"
    echo "  Expires: $expiry"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo -e "${RED}✗ SSL Certificate check failed${NC}"
  fi
}

check_ssl

echo ""
echo -e "${BLUE}🎯 Redirect Validation${NC}"

test_endpoint "Redirect www" "GET" "https://lacaveauxinstrum.fr/" "" "200"

echo ""
echo -e "${BLUE}📋 Final Report${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TOTAL_CHECKS -gt 0 ]; then
  PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
else
  PASS_RATE=0
fi

echo "Checks Passed: $PASSED_CHECKS / $TOTAL_CHECKS"
echo "Pass Rate: $PASS_RATE%"

if [ $PASS_RATE -eq 100 ]; then
  echo -e "${GREEN}Status: ✓ All systems operational${NC}"
  exit 0
elif [ $PASS_RATE -ge 90 ]; then
  echo -e "${YELLOW}Status: ⚠️  Minor issues detected${NC}"
  exit 0
else
  echo -e "${RED}Status: ✗ Critical issues detected${NC}"
  exit 1
fi
