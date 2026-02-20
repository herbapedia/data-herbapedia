#!/bin/bash

# Herbapedia to SIPM Integration Script
# This script copies herbapedia content into the main SIPM site

set -e

# Configuration
HERBAPEDIA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIPM_DIR="${HERBAPEDIA_DIR}/../sipm.github.io"

echo "Herbapedia to SIPM Integration"
echo "=============================="
echo ""

# Check if SIPM directory exists
if [ ! -d "$SIPM_DIR" ]; then
  echo "Error: SIPM directory not found at $SIPM_DIR"
  exit 1
fi

# 1. Copy herb content
echo "1. Copying herb content..."
mkdir -p "$SIPM_DIR/src/content/herbs"
cp -r "$HERBAPEDIA_DIR/src/content/herbs/"* "$SIPM_DIR/src/content/herbs/"
echo "   Done."

# 2. Copy herb images
echo "2. Copying herb images..."
mkdir -p "$SIPM_DIR/public/images/herbs"
cp -r "$HERBAPEDIA_DIR/public/images/herbs/"* "$SIPM_DIR/public/images/herbs/" 2>/dev/null || true
echo "   Done."

# 3. Copy views
echo "3. Copying views..."
mkdir -p "$SIPM_DIR/src/views/herbs"
cp -r "$HERBAPEDIA_DIR/src/views/herbs/"* "$SIPM_DIR/src/views/herbs/"
echo "   Done."

# 4. Copy composables
echo "4. Copying composables..."
cp "$HERBAPEDIA_DIR/src/composables/useHerb.js" "$SIPM_DIR/src/composables/"
echo "   Done."

# 5. Copy UI components
echo "5. Copying UI components..."
cp "$HERBAPEDIA_DIR/src/components/ui/HerbCard.vue" "$SIPM_DIR/src/components/ui/"
echo "   Done."

# 6. Add routes (manual step)
echo ""
echo "6. Routes need to be added manually to SIPM's router."
echo "   Add the following to $SIPM_DIR/src/router/index.js:"
echo ""
cat << 'EOF'
  // Herbapedia routes
  {
    path: '/herbapedia',
    name: 'herbapedia',
    component: () => import('@/views/herbs/HerbsView.vue')
  },
  {
    path: '/herbapedia/:category',
    name: 'herbapedia-category',
    component: () => import('@/views/herbs/CategoryView.vue'),
    props: true
  },
  {
    path: '/herbapedia/:category/:slug',
    name: 'herbapedia-detail',
    component: () => import('@/views/herbs/HerbDetailView.vue'),
    props: true
  },
EOF

echo ""
echo "Integration complete!"
echo ""
echo "Next steps:"
echo "1. Add the routes shown above to SIPM's router"
echo "2. Add 'Herbapedia' link to SIPM's navigation"
echo "3. Update vite.config.js SSG routes if needed"
echo "4. Test the integrated site"
