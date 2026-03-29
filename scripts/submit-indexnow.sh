#!/usr/bin/env bash
#
# Submit URLs to IndexNow (Bing, Yandex, Naver, Seznam, Yep).
# Called by the deploy workflow after merge to main.
#
# Usage:
#   ./scripts/submit-indexnow.sh                    # Submit all key pages
#   ./scripts/submit-indexnow.sh --new-only         # Submit only new page types
#

set -euo pipefail

HOST="wordle.global"
KEY="6888e34b60e7223407bf4148e2d2fe12"
API="https://api.indexnow.org/indexnow"

# All supported languages
LANGS=(ar az bg bn br ca ckb cs da de el en eo es et eu fa fi fo fr fur fy ga gd gl ha he hi hr hu hy hyw ia id ie is it ja ka ko la lb lt ltg lv mi mk mn mr ms nb nds ne nl nn oc pa pau pl pt ro ru rw sk sl sq sr sv sw tk tl tr uk ur uz vi yo)

# Build URL list
URLS=()

# Homepage
URLS+=("https://${HOST}/")

# Per-language pages
for lang in "${LANGS[@]}"; do
    # Daily game
    URLS+=("https://${HOST}/${lang}")
    # Game modes
    for mode in unlimited speed dordle quordle octordle sedecordle duotrigordle; do
        URLS+=("https://${HOST}/${lang}/${mode}")
    done
    # Best starting words (NEW)
    URLS+=("https://${HOST}/${lang}/best-starting-words")
    # Words archive hub
    URLS+=("https://${HOST}/${lang}/words")
done

echo "Submitting ${#URLS[@]} URLs to IndexNow..."

# IndexNow accepts up to 10,000 URLs per request
# Split into batches of 500 for safety
batch_size=500
total=${#URLS[@]}
submitted=0

for ((i = 0; i < total; i += batch_size)); do
    batch=("${URLS[@]:i:batch_size}")

    # Build JSON payload
    url_json=$(printf '"%s",' "${batch[@]}")
    url_json="[${url_json%,}]"

    payload=$(cat <<EOF
{
    "host": "${HOST}",
    "key": "${KEY}",
    "keyLocation": "https://${HOST}/${KEY}.txt",
    "urlList": ${url_json}
}
EOF
)

    response=$(curl -s -w "\n%{http_code}" -X POST "${API}" \
        -H "Content-Type: application/json; charset=utf-8" \
        -d "${payload}")

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    submitted=$((submitted + ${#batch[@]}))

    if [ "$http_code" = "200" ] || [ "$http_code" = "202" ]; then
        echo "  Batch $((i / batch_size + 1)): ${#batch[@]} URLs submitted (HTTP ${http_code})"
    else
        echo "  Batch $((i / batch_size + 1)): FAILED (HTTP ${http_code}): ${body}"
    fi
done

echo "Done. ${submitted} URLs submitted to IndexNow."
echo "Bing, Yandex, Naver, Seznam, and Yep will crawl these within minutes to hours."
echo ""
echo "Note: Google does not support IndexNow. Use Search Console for Google:"
echo "  https://search.google.com/search-console/sitemaps?resource_id=sc-domain:wordle.global"
