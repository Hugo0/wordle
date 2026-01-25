#!/bin/bash

# Download all GitHub issues, PRs, comments, and fork data for analysis
# Output directory
OUTPUT_DIR="/home/hugo/Projects/wordle/docs/github_data"
mkdir -p "$OUTPUT_DIR"

echo "=== Downloading GitHub Data for Wordle Analysis ==="
echo "Output directory: $OUTPUT_DIR"
echo ""

# 1. Download all issues with full details
echo "1. Downloading all issues..."
gh issue list --state all --limit 500 --json number,title,state,body,author,createdAt,closedAt,labels,comments,reactionGroups > "$OUTPUT_DIR/issues.json"
echo "   Done: $(jq length "$OUTPUT_DIR/issues.json") issues"

# 2. Download all PRs with full details
echo "2. Downloading all pull requests..."
gh pr list --state all --limit 500 --json number,title,state,body,author,createdAt,closedAt,mergedAt,labels,comments,files > "$OUTPUT_DIR/pull_requests.json"
echo "   Done: $(jq length "$OUTPUT_DIR/pull_requests.json") PRs"

# 3. Get repository info
echo "3. Downloading repository info..."
gh repo view --json name,description,stargazerCount,forkCount,watchers,issues,pullRequests,createdAt,updatedAt > "$OUTPUT_DIR/repo_info.json"
echo "   Done"

# 4. Get list of forks
echo "4. Downloading fork information..."
gh api repos/Hugo0/wordle/forks --paginate > "$OUTPUT_DIR/forks.json"
echo "   Done: $(jq length "$OUTPUT_DIR/forks.json") forks"

# 5. Get stargazers (recent)
echo "5. Downloading recent stargazers..."
gh api repos/Hugo0/wordle/stargazers --paginate -H "Accept: application/vnd.github.star+json" > "$OUTPUT_DIR/stargazers.json" 2>/dev/null || echo "   Stargazers data limited"

# 6. Get contributors
echo "6. Downloading contributors..."
gh api repos/Hugo0/wordle/contributors > "$OUTPUT_DIR/contributors.json"
echo "   Done"

# 7. Create a readable markdown summary of issues
echo "7. Creating readable issues summary..."
cat "$OUTPUT_DIR/issues.json" | jq -r '
  .[] |
  "## Issue #\(.number): \(.title)\n" +
  "**State:** \(.state) | **Author:** \(.author.login) | **Created:** \(.createdAt)\n\n" +
  "### Description\n\(.body // "No description")\n\n" +
  "### Comments (\(.comments | length))\n" +
  (if .comments | length > 0 then
    (.comments | map("- **\(.author.login)** (\(.createdAt)):\n  \(.body)\n") | join("\n"))
  else
    "No comments"
  end) +
  "\n\n---\n"
' > "$OUTPUT_DIR/issues_readable.md"
echo "   Done"

# 8. Create a readable markdown summary of PRs
echo "8. Creating readable PRs summary..."
cat "$OUTPUT_DIR/pull_requests.json" | jq -r '
  .[] |
  "## PR #\(.number): \(.title)\n" +
  "**State:** \(.state) | **Author:** \(.author.login) | **Created:** \(.createdAt)\n" +
  (if .mergedAt then "**Merged:** \(.mergedAt)\n" else "" end) +
  "\n### Description\n\(.body // "No description")\n\n" +
  "### Files Changed\n" +
  (if .files | length > 0 then
    (.files | map("- \(.path)") | join("\n"))
  else
    "No files listed"
  end) +
  "\n\n---\n"
' > "$OUTPUT_DIR/prs_readable.md"
echo "   Done"

# 9. Analyze forks - find active ones with recent commits
echo "9. Analyzing fork activity..."
cat "$OUTPUT_DIR/forks.json" | jq -r '
  sort_by(.pushed_at) | reverse | .[:20] |
  .[] |
  "\(.full_name) | Last push: \(.pushed_at) | Stars: \(.stargazers_count) | \(.html_url)"
' > "$OUTPUT_DIR/active_forks.txt"
echo "   Done - Top 20 most recently active forks saved"

echo ""
echo "=== Download Complete ==="
echo "Files created in $OUTPUT_DIR:"
ls -la "$OUTPUT_DIR"
