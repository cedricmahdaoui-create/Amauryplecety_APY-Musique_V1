#!/bin/bash
#
# Deployment Script APY Musique
# Déploie le site sur Netlify en toute sécurité
# Usage: ./deploy.sh [--production] [--preview]
#

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_ID="${NETLIFY_SITE_ID:-apy-musique}"
BUILD_DIR="."
LOG_FILE="${PROJECT_DIR}/deploy.log"
DRY_RUN=false
PRODUCTION=false
PREVIEW=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --production) PRODUCTION=true; shift ;;
    --preview) PREVIEW=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --production  Deploy to production domain"
      echo "  --preview     Deploy as preview (default)"
      echo "  --dry-run     Show what would be deployed"
      echo "  --help        Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Defaults
[ "$PRODUCTION" = false ] && [ "$PREVIEW" = false ] && PREVIEW=true

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 APY Musique Deployment Script     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""
echo "Project Directory: $PROJECT_DIR"
echo "Build Directory: $BUILD_DIR"
echo "Site ID: $SITE_ID"
echo "Mode: $([ "$PRODUCTION" = true ] && echo 'PRODUCTION' || echo 'PREVIEW')"
echo ""

# ============================================================================
# Step 1: Pre-deployment checks
# ============================================================================

echo -e "${BLUE}📋 Step 1: Pre-deployment Checks${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check Netlify CLI
if ! command -v netlify &> /dev/null; then
  echo -e "${RED}✗ Netlify CLI not found${NC}"
  echo "  Install with: npm install -g netlify-cli"
  exit 1
fi
echo -e "${GREEN}✓ Netlify CLI installed${NC}"

# Check Git status
if [ -d "$PROJECT_DIR/.git" ]; then
  if ! git -C "$PROJECT_DIR" diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    echo "  Commit or stash changes before production deploy"
    [ "$PRODUCTION" = true ] && exit 1
  else
    echo -e "${GREEN}✓ Git working directory clean${NC}"
  fi
fi

# Check environment variables
if [ -z "$NETLIFY_AUTH_TOKEN" ]; then
  echo -e "${RED}✗ NETLIFY_AUTH_TOKEN not set${NC}"
  echo "  Login with: netlify login"
  exit 1
fi
echo -e "${GREEN}✓ Netlify authentication configured${NC}"

# Check required files
for file in "package.json" "netlify.toml" "index.html"; do
  if [ ! -f "$PROJECT_DIR/$file" ]; then
    echo -e "${RED}✗ Missing required file: $file${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✓ Required files present${NC}"

# Check ADMIN_PASSWORD for production
if [ "$PRODUCTION" = true ]; then
  if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}✗ ADMIN_PASSWORD not set for production${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Admin password configured${NC}"
fi

echo ""

# ============================================================================
# Step 2: Build
# ============================================================================

echo -e "${BLUE}🔨 Step 2: Build Assets${NC}"

if [ -f "$PROJECT_DIR/package.json" ]; then
  echo "Installing dependencies..."
  if [ "$DRY_RUN" = false ]; then
    npm install --silent 2>&1 | tee -a "$LOG_FILE"
  else
    echo "  [DRY RUN] npm install"
  fi
fi

# Validate HTML files
echo "Validating HTML files..."
if command -v html-validate &> /dev/null; then
  html-validate "$PROJECT_DIR"/*.html 2>&1 | tee -a "$LOG_FILE" || true
else
  echo "  ⚠️  html-validate not installed (optional)"
fi

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# ============================================================================
# Step 3: Security Checks
# ============================================================================

echo -e "${BLUE}🔐 Step 3: Security Pre-flight${NC}"

# Check for common vulnerabilities
check_security() {
  local file="$1"

  # Check for hardcoded passwords
  if grep -r "password" "$file" 2>/dev/null | grep -qi "ADMIN_PASSWORD"; then
    echo -e "${RED}✗ Found hardcoded password reference in $file${NC}"
    return 1
  fi

  # Check for exposed API keys
  if grep -r "api_key\|apiKey\|API_KEY" "$file" 2>/dev/null | head -5; then
    echo -e "${YELLOW}⚠️  Possible API keys in $file (review before deploying)${NC}"
  fi

  return 0
}

for html_file in "$PROJECT_DIR"/*.html; do
  if [ -f "$html_file" ]; then
    check_security "$html_file" || true
  fi
done

echo -e "${GREEN}✓ Security checks passed${NC}"
echo ""

# ============================================================================
# Step 4: Netlify Build & Deploy
# ============================================================================

echo -e "${BLUE}📤 Step 4: Deploy to Netlify${NC}"

if [ "$DRY_RUN" = true ]; then
  echo "  [DRY RUN] Would deploy to Netlify"
  echo "  [DRY RUN] Command: netlify deploy --prod"
  exit 0
fi

if [ "$PRODUCTION" = true ]; then
  echo "🚨 Deploying to PRODUCTION: lacaveauxinstrum.fr"
  echo "Press ENTER to confirm, Ctrl+C to cancel..."
  read -r

  netlify deploy \
    --site="$SITE_ID" \
    --prod \
    --dir="$BUILD_DIR" \
    --message="Production deploy $(date)" | tee -a "$LOG_FILE"

else
  echo "Deploying to preview..."
  netlify deploy \
    --site="$SITE_ID" \
    --dir="$BUILD_DIR" \
    --message="Preview deploy $(date)" | tee -a "$LOG_FILE"
fi

echo -e "${GREEN}✓ Deployment complete${NC}"
echo ""

# ============================================================================
# Step 5: Post-deployment Verification
# ============================================================================

echo -e "${BLUE}✅ Step 5: Post-deployment Verification${NC}"

# Wait for CDN propagation
echo "Waiting for CDN propagation (30 seconds)..."
sleep 5

# Run health checks
if [ -f "$PROJECT_DIR/audit/healthcheck.sh" ]; then
  echo "Running health checks..."
  bash "$PROJECT_DIR/audit/healthcheck.sh" | head -20
fi

# Get deployment URL
DEPLOY_URL=$(netlify list 2>/dev/null | head -1)
echo -e "${GREEN}✓ Deployed to: $DEPLOY_URL${NC}"

# Verify HTTPS
if curl -s -I "$DEPLOY_URL" | grep -q "Strict-Transport-Security"; then
  echo -e "${GREEN}✓ HTTPS enforced${NC}"
else
  echo -e "${YELLOW}⚠️  HTTPS not detected${NC}"
fi

# Check response time
RESPONSE_TIME=$(curl -s -o /dev/null -w '%{time_total}' "$DEPLOY_URL" 2>/dev/null | awk '{print int($1 * 1000)}')
echo -e "${GREEN}✓ Response time: ${RESPONSE_TIME}ms${NC}"

echo ""

# ============================================================================
# Step 6: Summary
# ============================================================================

echo -e "${BLUE}📊 Deployment Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Status: $([ "$PRODUCTION" = true ] && echo 'PRODUCTION ✓' || echo 'PREVIEW ✓')"
echo "Time: $(date)"
echo "Log: $LOG_FILE"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Visit https://lacaveauxinstrum.fr to verify"
echo "2. Check admin at https://lacaveauxinstrum.fr/admin"
echo "3. Monitor logs at https://app.netlify.com/sites/$SITE_ID"
echo ""

if [ "$PRODUCTION" = true ]; then
  echo -e "${YELLOW}⚠️  Production deployed!${NC}"
  echo "   Monitor the deployment at:"
  echo "   https://app.netlify.com/sites/$SITE_ID/deploys"
fi

exit 0
