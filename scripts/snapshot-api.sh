#!/usr/bin/env bash
#
# Records what every endpoint answers, so a refactor that renames a response
# field shows up as a diff instead of as a bug report.
#
#   bash scripts/snapshot-api.sh               # full run: reads + writes + uploads
#   bash scripts/snapshot-api.sh --read-only   # no rows created or changed
#   bash scripts/snapshot-api.sh --no-uploads  # skip anything needing Supabase
#
# Then:  git diff snapshots/
#
# There is no test runner in this project. Prettier, ESLint and tsc cannot tell
# you that a response field changed name on the wire — this can.
#
# Needs: a running API, a seeded database, and scripts/.env.snapshot
# (copy scripts/.env.snapshot.example). See docs/refactor/phase-0-safety-net.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/snapshots"
HELPER="$ROOT/scripts/lib/snapshot-json.mjs"
ENV_FILE="$ROOT/scripts/.env.snapshot"

READ_ONLY=0
UPLOADS=1
for arg in "$@"; do
    case "$arg" in
        --read-only) READ_ONLY=1 ;;
        --no-uploads) UPLOADS=0 ;;
        *)
            echo "unknown option: $arg" >&2
            exit 2
            ;;
    esac
done

# --- configuration ----------------------------------------------------------

if [ ! -f "$ENV_FILE" ]; then
    echo "missing $ENV_FILE — copy scripts/.env.snapshot.example and fill it in" >&2
    exit 1
fi
# shellcheck disable=SC1090
set -a
. "$ENV_FILE"
set +a

API_URL="${API_URL:-http://localhost:4000}"

for var in PROVIDER_EMAIL PROVIDER_PASSWORD RECEIVER_EMAIL RECEIVER_PASSWORD \
    ADMIN_EMAIL ADMIN_PASSWORD; do
    if [ -z "${!var:-}" ]; then
        echo "$ENV_FILE is missing $var" >&2
        exit 1
    fi
done

# --- plumbing ---------------------------------------------------------------

WORK="$(mktemp -d)"
BODY="$WORK/body"
PNG="$WORK/pixel.png"

# Every value that changes between runs gets replaced with a placeholder, or
# the diff is unreadable. RUN is the one seed all of them hang off.
# Also the prefix on the two throwaway accounts, so `npm run db:seed -w api`
# can recognise and prune them later — they are soft-deleted, and nothing in
# the API can remove a soft-deleted company.
RUN="snapshot_probe_$(date +%s)"
SUBS=(--text "run=$RUN")

TOKEN_ADMIN=""
TOKEN_PROVIDER=""
TOKEN_A=""
TOKEN_B=""
COMPANY_A_ID=""
A_LIVE=0
B_LIVE=0
NEW_PORTFOLIO_ID=""
NEW_CERT_ID=""
NEW_JOB_POSTING_ID=""
# 1 between uploading the provider's photo and clearing it again. Unlike the
# two above there is no id: the column holds one photo per company, so the
# cleanup is "clear it" rather than "delete row N".
PHOTO_SET=0

# The script creates two throwaway companies. If it dies halfway they would sit
# in the admin list forever and every later run's diff would show them, so
# cleanup runs on the way out however we got there.
cleanup() {
    local code=$?
    set +e
    if [ -n "$NEW_JOB_POSTING_ID" ]; then
        (
            set -a
            [ -f "$ROOT/apps/api/.env" ] && . "$ROOT/apps/api/.env"
            set +a
            npx tsx -e "
                import { prisma } from './apps/api/src/lib/prisma';
                async function main() {
                    await prisma.listing.delete({ where: { listingId: $NEW_JOB_POSTING_ID } }).catch(() => {});
                }
                main().finally(() => prisma.\$disconnect());
            "
        ) >/dev/null 2>&1 || true
    fi
    # The rows the write stage creates, in case it died before deleting them.
    # A leftover certificate shows up in every later run's listing, which is
    # exactly how this got noticed.
    if [ -n "$NEW_CERT_ID" ]; then
        curl -sS -o /dev/null -X DELETE \
            "$API_URL/certificates/$NEW_CERT_ID" \
            -H "Authorization: Bearer $TOKEN_PROVIDER"
    fi
    if [ -n "$NEW_PORTFOLIO_ID" ]; then
        curl -sS -o /dev/null -X DELETE \
            "$API_URL/portfolios/$NEW_PORTFOLIO_ID" \
            -H "Authorization: Bearer $TOKEN_PROVIDER"
    fi
    # Left set, the seeded provider keeps a photo and every later run's
    # GET /companies/me diff shows it appear out of nowhere.
    if [ "$PHOTO_SET" = 1 ]; then
        curl -sS -o /dev/null -X DELETE "$API_URL/companies/me/photo" \
            -H "Authorization: Bearer $TOKEN_PROVIDER"
    fi
    if [ "$B_LIVE" = 1 ]; then
        curl -sS -o /dev/null -X DELETE "$API_URL/companies/me" \
            -H "Authorization: Bearer $TOKEN_B"
    fi
    if [ "$A_LIVE" = 1 ]; then
        curl -sS -o /dev/null -X DELETE "$API_URL/admin/companies/$COMPANY_A_ID" \
            -H "Authorization: Bearer $TOKEN_ADMIN" \
            -H 'Content-Type: application/json' \
            -d "{\"currentPassword\":\"$ADMIN_PASSWORD\"}"
    fi
    rm -rf "$WORK"
    exit $code
}
trap cleanup EXIT

# Calls the API, leaves the raw body in $BODY, prints the status code.
api() {
    local method=$1 path=$2
    shift 2
    curl -sS -X "$method" "$API_URL$path" -o "$BODY" -w '%{http_code}' "$@"
}

# Calls the API and writes snapshots/<name>.json.
snap() {
    local name=$1 method=$2 path=$3
    shift 3
    LAST_STATUS="$(api "$method" "$path" "$@")"
    LAST_REQUEST="$method $path"
    resnap "$name"
    printf '  %-3s %-6s %s\n' "$LAST_STATUS" "$method" "$path"
}

# Rewrites the snapshot snap() just made. A created row's id is only known from
# its own response, so the call that creates one has to be written twice: once
# to capture the id, then again with that id in SUBS.
resnap() {
    node "$HELPER" normalize \
        --request "$LAST_REQUEST" --status "$LAST_STATUS" "${SUBS[@]}" \
        <"$BODY" >"$OUT_DIR/$1.json"
}

# Reads one field out of the response snap() just made.
jget() { node "$HELPER" get "$1" <"$BODY"; }

bearer() { printf 'Authorization: Bearer %s' "$1"; }

# curl here is a native Windows build, so under Git Bash it cannot open a path
# like /tmp/x. Git Bash normally rewrites those on the way in, but not inside
# curl's -F "field=@path" form, where the @ hides the path from it. cygpath
# exists only on Windows, so this is a no-op on Linux and macOS.
winpath() {
    if command -v cygpath >/dev/null 2>&1; then
        cygpath -w "$1"
    else
        printf '%s' "$1"
    fi
}

# Without this the run limps on with an empty token, every later call 401s, and
# 40 snapshots record the wrong thing. Stop at the first bad login instead.
require_token() {
    if [ -z "$1" ]; then
        echo >&2
        echo "could not sign in as $2 — check $ENV_FILE, then see snapshots/$3.json" >&2
        exit 1
    fi
}

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/*.json

echo "API: $API_URL"
echo

# ---------------------------------------------------------------------------
# 1. Public, and the error envelopes
# ---------------------------------------------------------------------------

echo "public"
snap health GET /health
snap portfolios-list GET /portfolios
PORTFOLIO_ID="$(jget 0.portfolio_id)"
snap error-unauthorized GET /companies/me
snap error-unknown-route GET /no-such-route
snap error-bad-path-param GET /portfolios/not-a-number
snap error-portfolio-not-found GET /portfolios/2147483647

# ---------------------------------------------------------------------------
# 2. Sessions
# ---------------------------------------------------------------------------

echo
echo "sessions"
snap auth-login-provider POST /auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$PROVIDER_EMAIL\",\"password\":\"$PROVIDER_PASSWORD\"}"
TOKEN_PROVIDER="$(jget accessToken)"
require_token "$TOKEN_PROVIDER" "the provider" auth-login-provider

snap auth-login-receiver POST /auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$RECEIVER_EMAIL\",\"password\":\"$RECEIVER_PASSWORD\"}"
TOKEN_RECEIVER="$(jget accessToken)"
require_token "$TOKEN_RECEIVER" "the receiver" auth-login-receiver

snap auth-admin-login POST /auth/admin/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
TOKEN_ADMIN="$(jget accessToken)"
require_token "$TOKEN_ADMIN" "the admin" auth-admin-login

snap error-login-wrong-password POST /auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$PROVIDER_EMAIL\",\"password\":\"definitely-not-it\"}"

snap error-login-admin-at-company-door POST /auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"

# ---------------------------------------------------------------------------
# 3. The caller's own account
# ---------------------------------------------------------------------------

echo
echo "companies"
snap companies-me-provider GET /companies/me -H "$(bearer "$TOKEN_PROVIDER")"
PROVIDER_ID="$(jget company_id)"
PROVIDER_USERNAME="$(jget username)"

snap companies-me-receiver GET /companies/me -H "$(bearer "$TOKEN_RECEIVER")"
snap error-forbidden-role GET /certificates/mine -H "$(bearer "$TOKEN_RECEIVER")"

snap auth-check-availability-free POST /auth/check-availability \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${RUN}free\",\"email\":\"${RUN}free@example.test\"}"

snap auth-check-availability-taken POST /auth/check-availability \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$PROVIDER_USERNAME\",\"email\":\"$PROVIDER_EMAIL\"}"

# ---------------------------------------------------------------------------
# 4. Reads that need a seeded row
# ---------------------------------------------------------------------------

echo
echo "portfolios + certificates"
snap portfolios-by-company GET "/portfolios?companyId=$PROVIDER_ID"
LISTING_ID="$(jget 0.listingId)"

if [ -n "$PORTFOLIO_ID" ]; then
    snap portfolios-one GET "/portfolios/$PORTFOLIO_ID"
else
    echo "  --  skip   GET /portfolios/:portfolioId (no seeded portfolio)"
fi

snap certificates-mine GET /certificates/mine -H "$(bearer "$TOKEN_PROVIDER")"

echo
echo "admin"
snap admin-companies GET /admin/companies -H "$(bearer "$TOKEN_ADMIN")"
snap admin-companies-filtered GET "/admin/companies?page=1&pageSize=2&filter=PROVIDER" \
    -H "$(bearer "$TOKEN_ADMIN")"
snap admin-companies-detail GET "/admin/companies/$PROVIDER_ID" \
    -H "$(bearer "$TOKEN_ADMIN")"
snap error-admin-company-not-found GET /admin/companies/2147483647 \
    -H "$(bearer "$TOKEN_ADMIN")"

echo
echo "providers"
snap providers-list GET "/providers?page=1&pageSize=2" \
    -H "$(bearer "$TOKEN_RECEIVER")"

if [ "$READ_ONLY" = 1 ]; then
    echo
    echo "--read-only: stopping before the write endpoints"
    echo "wrote $(find "$OUT_DIR" -name '*.json' | wc -l | tr -d ' ') snapshots to snapshots/"
    exit 0
fi

# ---------------------------------------------------------------------------
# 5. Writes. Every row created here is removed again before the script ends.
# ---------------------------------------------------------------------------

echo
echo "register / profile / credentials"
snap error-register-validation POST /auth/register \
    -H 'Content-Type: application/json' \
    -d '{"companyName":"","username":"A B","email":"nope","password":"short","phone":"12","accountType":"WIZARD","companyType":[]}'

REGISTER_A="{\"companyName\":\"Snapshot Probe A\",\"username\":\"${RUN}a\",\"email\":\"${RUN}a@example.test\",\"password\":\"snapshot-probe-pw\",\"phone\":\"0812345678\",\"accountType\":\"PROVIDER\",\"companyType\":[\"Software House\"]}"

snap auth-register POST /auth/register \
    -H 'Content-Type: application/json' -d "$REGISTER_A"
TOKEN_A="$(jget accessToken)"
COMPANY_A_ID="$(jget company.company_id)"
A_LIVE=1
SUBS+=(--id "company_id=$COMPANY_A_ID")
resnap auth-register

snap error-register-conflict POST /auth/register \
    -H 'Content-Type: application/json' -d "$REGISTER_A"

snap companies-me-patch PATCH /companies/me -H "$(bearer "$TOKEN_A")" \
    -H 'Content-Type: application/json' \
    -d '{"companyName":"Snapshot Probe A edited","companyDescription":"edited by scripts/snapshot-api.sh","address":null,"serviceTerm":"30 days","warrantyPolicy":"none"}'

snap error-companies-me-patch-empty PATCH /companies/me -H "$(bearer "$TOKEN_A")" \
    -H 'Content-Type: application/json' -d '{}'

snap companies-me-credentials PATCH /companies/me/credentials \
    -H "$(bearer "$TOKEN_A")" -H 'Content-Type: application/json' \
    -d "{\"currentPassword\":\"snapshot-probe-pw\",\"username\":\"${RUN}a2\"}"
TOKEN_A="$(jget accessToken)"

snap auth-logout POST /auth/logout -H "$(bearer "$TOKEN_A")"
snap error-logout-twice POST /auth/logout -H "$(bearer "$TOKEN_A")"

echo
echo "self-service deletion"
snap auth-register-receiver POST /auth/register \
    -H 'Content-Type: application/json' \
    -d "{\"companyName\":\"Snapshot Probe B\",\"username\":\"${RUN}b\",\"email\":\"${RUN}b@example.test\",\"password\":\"snapshot-probe-pw\",\"phone\":\"0898765432\",\"accountType\":\"RECEIVER\",\"companyType\":[\"SME\"]}"
TOKEN_B="$(jget accessToken)"
B_LIVE=1
SUBS+=(--id "company_id=$(jget company.company_id)")
resnap auth-register-receiver

snap companies-me-delete DELETE /companies/me -H "$(bearer "$TOKEN_B")"
B_LIVE=0
snap error-session-ended GET /companies/me -H "$(bearer "$TOKEN_B")"

# ---------------------------------------------------------------------------
# 6. Portfolios and certificates. Both carry an image, so both need Supabase.
# ---------------------------------------------------------------------------

if [ "$UPLOADS" = 1 ]; then
    # A 1x1 PNG, written here rather than committed: the smallest file that
    # gets past multer's mimetype allowlist.
    printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' | base64 -d >"$PNG"
    IMAGE="$(winpath "$PNG")"

    echo
    echo "portfolio lifecycle"
    if [ -n "$LISTING_ID" ]; then
        # portfolioImage is the multipart field name, and a wire name like any
        # other — Phase 2 renames it, and only this call would notice.
        snap portfolios-create POST /portfolios -H "$(bearer "$TOKEN_PROVIDER")" \
            -F "listingId=$LISTING_ID" \
            -F 'portfolioName=Snapshot Probe portfolio' \
            -F 'portfolioDescription=created by scripts/snapshot-api.sh' \
            -F 'developmentDate=2026-01-15' \
            -F "portfolioLink=https://example.test/$RUN/portfolio" \
            -F "portfolioImage=@$IMAGE;type=image/png"
        NEW_PORTFOLIO_ID="$(jget portfolio_id)"

        if [ -n "$NEW_PORTFOLIO_ID" ]; then
            SUBS+=(--id "portfolio_id=$NEW_PORTFOLIO_ID")
            resnap portfolios-create
            snap portfolios-update PATCH "/portfolios/$NEW_PORTFOLIO_ID" \
                -H "$(bearer "$TOKEN_PROVIDER")" \
                -F 'portfolioName=Snapshot Probe portfolio edited' \
                -F "portfolioImage=@$IMAGE;type=image/png"
            # strictObject: a misspelled key is a 400 naming the key, not a
            # 200 that wrote nothing. Snapshotted because that is a convention
            # (docs/conventions.md section 12) and nothing else would catch a
            # schema quietly going back to z.object.
            snap error-portfolio-unknown-field PATCH \
                "/portfolios/$NEW_PORTFOLIO_ID" \
                -H "$(bearer "$TOKEN_PROVIDER")" \
                -F 'portfolioNmae=typo'

            snap portfolios-delete DELETE "/portfolios/$NEW_PORTFOLIO_ID" \
                -H "$(bearer "$TOKEN_PROVIDER")"
        fi
    else
        echo "  --  skip   POST /portfolios (seeded provider owns no service listing)"
    fi

    echo
    echo "certificate lifecycle"
    snap certificates-create POST /certificates -H "$(bearer "$TOKEN_PROVIDER")" \
        -F 'certTitle=Snapshot Probe certificate' \
        -F 'organization=Snapshot Probe Authority' \
        -F 'issueMonth=1' -F 'issueYear=2025' \
        -F 'expireMonth=1' -F 'expireYear=2030' \
        -F "credentialId=$RUN" \
        -F "credentialUrl=https://example.test/$RUN/cert" \
        -F "certImage=@$IMAGE;type=image/png"
    # The bare resource now, not { message, certificate } — Phase 4 unwrapped it.
    NEW_CERT_ID="$(jget certificateId)"

    if [ -n "$NEW_CERT_ID" ]; then
        SUBS+=(--id "certificate_id=$NEW_CERT_ID")
        resnap certificates-create
        snap error-certificate-date-order PATCH "/certificates/$NEW_CERT_ID" \
            -H "$(bearer "$TOKEN_PROVIDER")" -F 'expireYear=2000'
        snap certificates-update PATCH "/certificates/$NEW_CERT_ID" \
            -H "$(bearer "$TOKEN_PROVIDER")" \
            -F 'certTitle=Snapshot Probe certificate edited' \
            -F "certImage=@$IMAGE;type=image/png"
        snap certificates-delete DELETE "/certificates/$NEW_CERT_ID" \
            -H "$(bearer "$TOKEN_PROVIDER")"
    fi

    echo
    echo "profile photo lifecycle"
    # No file attached. Multer lets that through — nothing was rejected — so
    # the 400 comes from the handler, and only this call would notice it going
    # missing.
    snap error-photo-missing PATCH /companies/me/photo \
        -H "$(bearer "$TOKEN_PROVIDER")"

    snap companies-me-photo PATCH /companies/me/photo \
        -H "$(bearer "$TOKEN_PROVIDER")" \
        -F "photo=@$IMAGE;type=image/png"
    PHOTO_SET=1

    snap companies-me-photo-delete DELETE /companies/me/photo \
        -H "$(bearer "$TOKEN_PROVIDER")"
    PHOTO_SET=0
else
    echo
    echo "--no-uploads: skipping the portfolio and certificate lifecycles"
fi

# ---------------------------------------------------------------------------
# 7. Admin writes. Last, because the final one deletes company A.
# ---------------------------------------------------------------------------

echo
echo "admin writes"
snap admin-companies-search GET "/admin/companies?q=$RUN&includeDeleted=true" \
    -H "$(bearer "$TOKEN_ADMIN")"

snap admin-companies-patch PATCH "/admin/companies/$COMPANY_A_ID" \
    -H "$(bearer "$TOKEN_ADMIN")" -H 'Content-Type: application/json' \
    -d '{"companyName":"Snapshot Probe A edited by admin","phone":"0800000000"}'

snap error-admin-delete-wrong-password DELETE "/admin/companies/$COMPANY_A_ID" \
    -H "$(bearer "$TOKEN_ADMIN")" -H 'Content-Type: application/json' \
    -d '{"currentPassword":"definitely-not-it"}'

snap admin-companies-delete DELETE "/admin/companies/$COMPANY_A_ID" \
    -H "$(bearer "$TOKEN_ADMIN")" -H 'Content-Type: application/json' \
    -d "{\"currentPassword\":\"$ADMIN_PASSWORD\"}"
A_LIVE=0

# ---------------------------------------------------------------------------
# 8. Job postings (US2-6)
# ---------------------------------------------------------------------------

echo
echo "job postings"
snap error-job-postings-unauthorized POST /job-postings \
    -H 'Content-Type: application/json' \
    -d '{"listingTitle":"Unauthorized"}'

snap error-job-postings-forbidden-provider POST /job-postings \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"listingTitle":"Provider cannot post job","listingDesc":"desc","maxBudget":10000}'

snap error-job-postings-validation POST /job-postings \
    -H "$(bearer "$TOKEN_RECEIVER")" \
    -H 'Content-Type: application/json' \
    -d '{"listingTitle":"","listingDesc":"","minBudget":20000,"maxBudget":10000,"deadline":"2020-01-01","categoryIds":[99999]}'

snap job-postings-create POST /job-postings \
    -H "$(bearer "$TOKEN_RECEIVER")" \
    -H 'Content-Type: application/json' \
    -d "{\"listingTitle\":\"Snapshot Probe job posting\",\"listingDesc\":\"Looking for developer team\",\"minBudget\":50000,\"maxBudget\":150000,\"locationPref\":\"Remote\",\"duration\":\"2 Months\",\"deadline\":\"2028-12-31\",\"categoryIds\":[1]}"
NEW_JOB_POSTING_ID="$(jget jobPostingId)"

if [ -n "$NEW_JOB_POSTING_ID" ]; then
    SUBS+=(--id "job_posting_id=$NEW_JOB_POSTING_ID")
    resnap job-postings-create
fi

# ---------------------------------------------------------------------------
# 9. View job postings and visibility rules (US2-7)
# ---------------------------------------------------------------------------

snap error-job-postings-list-unauthorized GET /job-postings

snap error-job-postings-list-invalid-status GET /job-postings?status=INVALID \
    -H "$(bearer "$TOKEN_RECEIVER")"

snap job-postings-list-open GET /job-postings?status=OPEN \
    -H "$(bearer "$TOKEN_PROVIDER")"

if [ -n "$NEW_JOB_POSTING_ID" ]; then
    (
        set -a
        [ -f "$ROOT/apps/api/.env" ] && . "$ROOT/apps/api/.env"
        set +a
        npx tsx -e "
            import { prisma } from './apps/api/src/lib/prisma';
            async function main() {
                await prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { listingStatus: 'CLOSED' } });
            }
            main().finally(() => prisma.\$disconnect());
        "
    ) >/dev/null 2>&1 || true
fi

snap job-postings-list-closed-provider GET /job-postings?status=CLOSED \
    -H "$(bearer "$TOKEN_PROVIDER")"

snap job-postings-list-closed-receiver GET /job-postings?status=CLOSED \
    -H "$(bearer "$TOKEN_RECEIVER")"

snap error-job-postings-one-unauthorized GET "/job-postings/$NEW_JOB_POSTING_ID"

snap error-job-postings-one-invalid-id GET /job-postings/not-a-number \
    -H "$(bearer "$TOKEN_RECEIVER")"

snap error-job-postings-one-not-found GET /job-postings/2147483647 \
    -H "$(bearer "$TOKEN_RECEIVER")"

snap error-job-postings-one-closed-forbidden GET "/job-postings/$NEW_JOB_POSTING_ID" \
    -H "$(bearer "$TOKEN_PROVIDER")"

snap job-postings-one-closed-receiver GET "/job-postings/$NEW_JOB_POSTING_ID" \
    -H "$(bearer "$TOKEN_RECEIVER")"

if [ -n "$NEW_JOB_POSTING_ID" ]; then
    (
        set -a
        [ -f "$ROOT/apps/api/.env" ] && . "$ROOT/apps/api/.env"
        set +a
        npx tsx -e "
            import { prisma } from './apps/api/src/lib/prisma';
            async function main() {
                await prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { listingStatus: 'OPEN' } });
            }
            main().finally(() => prisma.\$disconnect());
        "
    ) >/dev/null 2>&1 || true
fi

snap job-postings-one-open GET "/job-postings/$NEW_JOB_POSTING_ID" \
    -H "$(bearer "$TOKEN_PROVIDER")"

echo
echo "wrote $(find "$OUT_DIR" -name '*.json' | wc -l | tr -d ' ') snapshots to snapshots/"
echo "now run: git diff snapshots/"

