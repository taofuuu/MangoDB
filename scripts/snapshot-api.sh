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
NEW_PROPOSAL_ID=""
PROVIDER_ID=""
RECEIVER_ID=""
# Service search: the probe service, and probe C, a Provider that deletes
# itself while its service stays OPEN.
NEW_SERVICE_ID=""
DELETED_SERVICE_ID=""
# Service delete (US2-4): the probe the delete section removes.
DELETE_PROBE_ID=""
TOKEN_C=""
C_LIVE=0
# ADR 0009: a second probe whose tech name differs only in case, and 1 once
# tech names starting with the run id may exist in tech_stack.
REUSE_SERVICE_ID=""
TECH_STACK_SET=0
# Service filters: four probe services, each with a tech named after the run.
FILTER_WEB_ID=""
FILTER_MOBILE_ID=""
FILTER_WIDE_ID=""
FILTER_NO_MIN_ID=""
# Close job postings (US2-14): a second probe posting, with one pending proposal.
CLOSE_POSTING_ID=""
# 1 between uploading the provider's photo and clearing it again. Unlike the
# two above there is no id: the column holds one photo per company, so the
# cleanup is "clear it" rather than "delete row N".
PHOTO_SET=0

# Runs one Prisma call straight against the database, for the state no endpoint
# can set (closing a listing, deleting one). Pass one promise, on one line: on
# Windows npx goes through cmd.exe, which drops everything after the first
# newline of an argument, so a multi-line script ran nothing and exited 0.
# --env-file, not `. .env`: a shell reads an unquoted value with a space in it
# as a command, and under set -e that ended the whole run.
run_db() {
    (
        cd "$ROOT"
        npx tsx --env-file=apps/api/.env -e "import { prisma } from './apps/api/src/lib/prisma'; $1.finally(() => prisma.\$disconnect());"
    ) >/dev/null
}

# Like run_db, but prints what the promise resolves to, for a row no endpoint
# can create yet and whose id the calls after it need. Last line only: tsx and
# Prisma may print their own lines first. stdout.write, not console.log, which
# colours a number and puts escape codes in the id.
db_value() {
    (
        cd "$ROOT"
        npx tsx --env-file=apps/api/.env -e "import { prisma } from './apps/api/src/lib/prisma'; $1.then((v) => process.stdout.write(String(v))).finally(() => prisma.\$disconnect());"
    ) | tail -n 1
}

# The script creates three throwaway companies. If it dies halfway they would sit
# in the admin list forever and every later run's diff would show them, so
# cleanup runs on the way out however we got there.
cleanup() {
    local code=$?
    set +e
    # The listings the script created. Unquoted on purpose: echo drops the
    # ids that were never set, so only real ones reach the query.
    local listing_ids
    # shellcheck disable=SC2086
    listing_ids="$(echo $NEW_JOB_POSTING_ID $NEW_SERVICE_ID $DELETED_SERVICE_ID \
        $REUSE_SERVICE_ID $DELETE_PROBE_ID $FILTER_WEB_ID $FILTER_MOBILE_ID \
        $FILTER_WIDE_ID $FILTER_NO_MIN_ID $CLOSE_POSTING_ID)"
    if [ -n "$listing_ids" ]; then
        run_db "prisma.listing.deleteMany({ where: { listingId: { in: [${listing_ids// /,}] } } })"
    fi
    # Deleting the services removed their links, but not the tech names. Only
    # names this run made start with its id, so no real service loses a tech.
    if [ "$TECH_STACK_SET" = 1 ]; then
        run_db "prisma.techStack.deleteMany({ where: { techStackName: { startsWith: '$RUN' } } })"
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
    if [ "$C_LIVE" = 1 ]; then
        curl -sS -o /dev/null -X DELETE "$API_URL/companies/me" \
            -H "Authorization: Bearer $TOKEN_C"
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
RECEIVER_ID="$(jget company_id)"
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
echo "companies"
snap companies-list GET "/companies?page=1&pageSize=2" \
    -H "$(bearer "$TOKEN_RECEIVER")"
# T3.6.13: the seeded Provider and Receiver share "Snapshot Seed", so both come
# back. The seeded admin shares it too, and stays out.
snap companies-search-both-types GET "/companies?q=Snapshot%20Seed" \
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
# 6b. Delete a service (US2-4). Before section 7, because probe A is the
# "other Provider" for the 403 and section 7 deletes it.
# ---------------------------------------------------------------------------

echo
echo "service delete"
# Its own probe, so the search snapshots later never see it.
api POST /services -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d "{\"listingTitle\":\"Snapshot Probe delete $RUN\",\"listingDesc\":\"created by scripts/snapshot-api.sh\",\"maxBudget\":50000}" >/dev/null
DELETE_PROBE_ID="$(jget listingId)"
if [ -z "$DELETE_PROBE_ID" ]; then
    echo "could not create the delete probe service:" >&2
    cat "$BODY" >&2
    exit 1
fi
SUBS+=(--id "delete_probe_id=$DELETE_PROBE_ID")

snap error-services-delete-unauthorized DELETE "/services/$DELETE_PROBE_ID"

snap error-services-delete-invalid-id DELETE /services/not-a-number \
    -H "$(bearer "$TOKEN_PROVIDER")"

snap error-services-delete-not-found DELETE /services/2147483647 \
    -H "$(bearer "$TOKEN_PROVIDER")"

# requireRole('provider') stops a Receiver before the ownership check.
snap error-services-delete-wrong-role DELETE "/services/$DELETE_PROBE_ID" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# Probe A is a Provider, but not the owner. It logged out in section 5, so
# it signs in again first.
api POST /auth/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"${RUN}a@example.test\",\"password\":\"snapshot-probe-pw\"}" >/dev/null
TOKEN_A="$(jget accessToken)"
snap error-services-delete-forbidden DELETE "/services/$DELETE_PROBE_ID" \
    -H "$(bearer "$TOKEN_A")"

snap services-delete DELETE "/services/$DELETE_PROBE_ID" \
    -H "$(bearer "$TOKEN_PROVIDER")"

# Hard delete, so a second try is a 404.
snap error-services-delete-gone DELETE "/services/$DELETE_PROBE_ID" \
    -H "$(bearer "$TOKEN_PROVIDER")"

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
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { listingStatus: 'CLOSED' } })"
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
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { listingStatus: 'OPEN' } })"
fi

snap job-postings-one-open GET "/job-postings/$NEW_JOB_POSTING_ID" \
    -H "$(bearer "$TOKEN_PROVIDER")"

# ---------------------------------------------------------------------------
# 10. Submit proposals to open job postings (US2-8)
# ---------------------------------------------------------------------------

echo
echo "submit proposals"

snap error-proposals-unauthorized POST "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":50000,"proposalTerms":"Terms","duration":2}'

snap error-proposals-forbidden-receiver POST "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_RECEIVER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":50000,"proposalTerms":"Terms","duration":2}'

snap error-proposals-invalid-id POST /job-postings/not-a-number/proposals \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":50000,"proposalTerms":"Terms","duration":2}'

snap error-proposals-not-found POST /job-postings/2147483647/proposals \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":50000,"proposalTerms":"Terms","duration":2}'

snap error-proposals-validation POST "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":-100,"proposalTerms":"","duration":1.3}'

if [ -n "$NEW_JOB_POSTING_ID" ]; then
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { companyId: $PROVIDER_ID } })"
fi

snap error-proposals-own-posting POST "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":50000,"proposalTerms":"Terms","duration":2}'

if [ -n "$NEW_JOB_POSTING_ID" ]; then
    # Restore owner back to Receiver immediately after own-posting probe
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { companyId: $RECEIVER_ID } })"
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { listingStatus: 'CLOSED' } })"
fi

snap error-proposals-closed POST "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":50000,"proposalTerms":"Terms","duration":2}'

if [ -n "$NEW_JOB_POSTING_ID" ]; then
    # Ensure posting is OPEN and owned by Receiver before creating valid proposal
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { companyId: $RECEIVER_ID, listingStatus: 'OPEN' } })"
fi

snap proposals-create POST "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":80000,"proposalTerms":"Full-stack development in 2 months with agile delivery.","duration":2}'
NEW_PROPOSAL_ID="$(jget proposalId)"

if [ -n "$NEW_PROPOSAL_ID" ]; then
    SUBS+=(--id "proposal_id=$NEW_PROPOSAL_ID")
    resnap proposals-create
fi

snap error-proposals-repeat POST "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":80000,"proposalTerms":"Full-stack development in 2 months with agile delivery.","duration":2}'

# US2-10. The proposals on the posting: the one just created, with its Provider.
snap error-posting-proposals-unauthorized GET "/job-postings/$NEW_JOB_POSTING_ID/proposals"

snap error-posting-proposals-invalid-id GET /job-postings/not-a-number/proposals \
    -H "$(bearer "$TOKEN_RECEIVER")"

snap error-posting-proposals-not-found GET /job-postings/2147483647/proposals \
    -H "$(bearer "$TOKEN_RECEIVER")"

snap error-posting-proposals-forbidden-provider GET "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_PROVIDER")"

# Another Receiver: hand the posting to a different company for one call, so the
# seeded Receiver is signed in but no longer its owner.
if [ -n "$NEW_JOB_POSTING_ID" ]; then
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { companyId: $PROVIDER_ID } })"
fi

snap error-posting-proposals-forbidden-receiver GET "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_RECEIVER")"

if [ -n "$NEW_JOB_POSTING_ID" ]; then
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { companyId: $RECEIVER_ID } })"
fi

snap posting-proposals-list GET "/job-postings/$NEW_JOB_POSTING_ID/proposals" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# ---------------------------------------------------------------------------
# 11. Service search (US3-1)
# ---------------------------------------------------------------------------

echo
echo "service search"
# The probe: the newest open service, and the only one with $RUN in its title.
# Created with api, not snap: POST /services has its own tests (US2-1). Its
# tech names start with the run id, so cleanup can delete them safely.
TECH_STACK_SET=1
api POST /services -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d "{\"listingTitle\":\"Snapshot Probe service $RUN\",\"listingDesc\":\"created by scripts/snapshot-api.sh\",\"minBudget\":10000,\"maxBudget\":50000,\"categoryIds\":[1],\"techStack\":[\"${RUN}-React\",\"${RUN}-Node.js\"]}" >/dev/null
NEW_SERVICE_ID="$(jget listingId)"
if [ -z "$NEW_SERVICE_ID" ]; then
    echo "could not create the probe service:" >&2
    cat "$BODY" >&2
    exit 1
fi
SUBS+=(--id "listing_id=$NEW_SERVICE_ID")

# Probe C: a Provider that deletes itself. A soft delete leaves its service
# OPEN, so only the deletedAt filter can keep it out of the results below.
api POST /auth/register -H 'Content-Type: application/json' \
    -d "{\"companyName\":\"Snapshot Probe C\",\"username\":\"${RUN}c\",\"email\":\"${RUN}c@example.test\",\"password\":\"snapshot-probe-pw\",\"phone\":\"0811111111\",\"accountType\":\"PROVIDER\",\"companyType\":[\"Software House\"]}" >/dev/null
TOKEN_C="$(jget accessToken)"
if [ -z "$TOKEN_C" ]; then
    echo "could not register probe C:" >&2
    cat "$BODY" >&2
    exit 1
fi
C_LIVE=1
api POST /services -H "$(bearer "$TOKEN_C")" \
    -H 'Content-Type: application/json' \
    -d "{\"listingTitle\":\"Snapshot Probe deleted service $RUN\",\"listingDesc\":\"created by scripts/snapshot-api.sh\",\"maxBudget\":50000}" >/dev/null
DELETED_SERVICE_ID="$(jget listingId)"
[ "$(api DELETE /companies/me -H "$(bearer "$TOKEN_C")")" = 204 ] && C_LIVE=0

# T3.1.8 and T3.1.10: the probe comes first; probe C's service, though newer,
# does not appear.
snap services-search-default GET "/services?page=1&pageSize=3" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T3.1.9 and T3.1.10: only the probe matches; probe C's service is hidden.
snap services-search-keyword GET "/services?q=$RUN" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# ADR 0009: a company card lists every tech its services use. companies-list
# runs before the probe exists, so this is where the stack shows.
snap companies-search-service-stack GET "/companies?q=$RUN" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T3.1.11: no match is a 200 with an empty page, not an error.
snap services-search-no-match GET "/services?q=${RUN}_none" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T3.1.10: a closed service is hidden, with and without a keyword.
run_db "prisma.listing.update({ where: { listingId: $NEW_SERVICE_ID }, data: { listingStatus: 'CLOSED' } })"

snap services-search-closed GET "/services?q=$RUN" \
    -H "$(bearer "$TOKEN_RECEIVER")"

snap services-search-closed-default GET "/services?page=1&pageSize=3" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# ADR 0009: "<run>-react" links to the probe's "<run>-React" instead of
# adding a second tech, so the answer shows the stored spelling.
snap services-create-tech-reuse POST /services -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d "{\"listingTitle\":\"Snapshot Probe reuse service\",\"listingDesc\":\"created by scripts/snapshot-api.sh\",\"maxBudget\":50000,\"techStack\":[\"${RUN}-react\"]}"
REUSE_SERVICE_ID="$(jget listingId)"
if [ -n "$REUSE_SERVICE_ID" ]; then
    SUBS+=(--id "listing_id=$REUSE_SERVICE_ID")
    resnap services-create-tech-reuse
fi

# ---------------------------------------------------------------------------
# 12. Reject a proposal
# ---------------------------------------------------------------------------

echo
echo "proposals"
PROPOSAL_ID="$NEW_PROPOSAL_ID"


if [ -n "$PROPOSAL_ID" ]; then
    SUBS+=(--id "proposal_id=$PROPOSAL_ID")

    snap error-proposals-reject-unauthorized POST "/proposals/$PROPOSAL_ID/reject"

    snap error-proposals-reject-invalid-id POST /proposals/not-a-number/reject \
        -H "$(bearer "$TOKEN_RECEIVER")"

    snap error-proposals-reject-not-found POST /proposals/2147483647/reject \
        -H "$(bearer "$TOKEN_RECEIVER")"

    # The provider sent the proposal but does not own the listing.
    snap error-proposals-reject-forbidden POST "/proposals/$PROPOSAL_ID/reject" \
        -H "$(bearer "$TOKEN_PROVIDER")"

    snap proposals-reject POST "/proposals/$PROPOSAL_ID/reject" \
        -H "$(bearer "$TOKEN_RECEIVER")"

    # Now REJECTED, so a second reject is a state conflict.
    snap error-proposals-reject-conflict POST "/proposals/$PROPOSAL_ID/reject" \
        -H "$(bearer "$TOKEN_RECEIVER")"
else
    echo "  --  skip   POST /proposals/:proposalId/reject (no probe proposal)"
fi

# ---------------------------------------------------------------------------
# 13. Service filters (US3-2)
# ---------------------------------------------------------------------------

echo
echo "service filters"
# Four probe services, each with a tech named exactly after the run. Every
# query below adds techStack=$RUN, so it only ever sees these four: section
# 11's "<run>-React" is a different name.
probe_service() {
    # An empty min leaves minBudget out of the body, as the API allows.
    local min=""
    [ -n "$2" ] && min="\"minBudget\":$2,"
    api POST /services -H "$(bearer "$TOKEN_PROVIDER")" \
        -H 'Content-Type: application/json' \
        -d "{\"listingTitle\":\"Snapshot Probe $1 service $RUN\",\"listingDesc\":\"created by scripts/snapshot-api.sh\",${min}\"maxBudget\":$3,\"categoryIds\":[$4],\"techStack\":[\"$RUN\"]}" >/dev/null
    jget listingId
}
FILTER_WEB_ID="$(probe_service web 10000 50000 1)"
FILTER_MOBILE_ID="$(probe_service mobile 80000 120000 2)"
FILTER_WIDE_ID="$(probe_service wide 50000 200000 '')"
FILTER_NO_MIN_ID="$(probe_service no-min '' 30000 '')"
if [ -z "$FILTER_WEB_ID" ] || [ -z "$FILTER_MOBILE_ID" ] ||
    [ -z "$FILTER_WIDE_ID" ] || [ -z "$FILTER_NO_MIN_ID" ]; then
    echo "could not create the filter probe services:" >&2
    cat "$BODY" >&2
    exit 1
fi
SUBS+=(--id "listing_id=$FILTER_WEB_ID" --id "listing_id=$FILTER_MOBILE_ID" \
    --id "listing_id=$FILTER_WIDE_ID" --id "listing_id=$FILTER_NO_MIN_ID")

# T3.2.7: the web probe only. The mobile probe is in another category, and the
# wide and no-min ones have none.
snap services-filter-category-and-stack GET \
    "/services?techStack=$RUN&category=Web%20Development" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# Two values in one group match either: the web and mobile probes.
snap services-filter-category-either GET \
    "/services?techStack=$RUN&category=Web%20Development&category=Mobile%20App%20Development" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# Case is ignored: "web development" still finds the web probe.
snap services-filter-case GET \
    "/services?techStack=$RUN&category=web%20development" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T3.2.8: nothing matches, so 200 with an empty page, not an error.
snap services-filter-no-match GET \
    "/services?techStack=$RUN&category=Hardware%20%26%20IoT" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T3.2.9: the mobile probe only. The keyword alone matches many services, the
# filter alone all four.
snap services-filter-keyword-and-filter GET \
    "/services?techStack=$RUN&q=mobile" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T3.2.10: overlap. The mobile (80000-120000) and wide (50000-200000) probes
# both reach into 60000-100000; the web and no-min probes top out at 50000 and
# 30000.
snap services-filter-price GET \
    "/services?techStack=$RUN&minPrice=60000&maxPrice=100000" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T3.2.10: the web probe starts at or under 20000, and the no-min probe has no
# start, so it counts as open-ended. The wide probe starts at 50000.
snap services-filter-price-max GET \
    "/services?techStack=$RUN&maxPrice=20000" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# Only the wide probe reaches 150000; the mobile one tops out at 120000.
snap services-filter-price-min GET \
    "/services?techStack=$RUN&minPrice=150000" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# A blank price means no limit, not 0: all four probes.
snap services-filter-price-empty GET \
    "/services?techStack=$RUN&maxPrice=" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# Slider ends that cross are a 400 the filter panel can show.
snap error-services-filter-price-range GET \
    "/services?minPrice=200000&maxPrice=1000" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# ---------------------------------------------------------------------------
# 14. Edit job postings (US2-13)
# ---------------------------------------------------------------------------

echo
echo "edit job postings"
# The probe posting from section 8, Open and owned by the receiver again
# since section 10.
if [ -n "$NEW_JOB_POSTING_ID" ]; then
    snap error-job-postings-update-unauthorized PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H 'Content-Type: application/json' \
        -d '{"listingTitle":"Unauthorized edit"}'

    snap error-job-postings-update-not-found PATCH /job-postings/2147483647 \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"listingTitle":"Nobody owns this"}'

    # T2.13.9: the provider can see the posting but does not own it.
    snap error-job-postings-update-forbidden PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_PROVIDER")" -H 'Content-Type: application/json' \
        -d '{"listingTitle":"Not my posting"}'

    # T2.13.6: a partial edit. Fields left out keep their values, and the
    # categories are swapped for the new set.
    snap job-postings-update PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"listingTitle":"Snapshot Probe job posting edited","maxBudget":200000,"deadline":"2029-06-30","categoryIds":[2]}'

    snap job-postings-update-persisted GET "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")"

    # T2.13.7: every one of these is a 400, and the GET after them shows
    # the posting exactly as job-postings-update-persisted left it.
    snap error-job-postings-update-validation PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"listingTitle":"","maxBudget":-5,"deadline":"2020-01-01"}'

    # Only one budget sent: 250000 is over the stored max of 200000.
    snap error-job-postings-update-budget PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"minBudget":250000}'

    # Only the max sent: 40000 is under the stored min of 50000, and the error
    # names maxBudget, the field the form changed.
    snap error-job-postings-update-budget-max PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"maxBudget":40000}'

    snap error-job-postings-update-unknown-category PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"categoryIds":[99999]}'

    snap error-job-postings-update-empty PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{}'

    # A misspelled key is a 400, not a 200 that wrote nothing.
    snap error-job-postings-update-unknown-key PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"listingTitel":"Typo"}'

    snap job-postings-update-unchanged GET "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")"

    # T2.13.8: a Closed posting cannot be edited, even by its owner.
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { listingStatus: 'CLOSED' } })"

    snap error-job-postings-update-closed PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"listingTitle":"Too late"}'

    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { listingStatus: 'OPEN' } })"

    # A row saved with min over max, as mock data can be. An edit that sends
    # no budget still saves, and the bad budgets come back untouched.
    run_db "prisma.listing.update({ where: { listingId: $NEW_JOB_POSTING_ID }, data: { minBudget: 300000 } })"

    snap job-postings-update-bad-stored-budget PATCH "/job-postings/$NEW_JOB_POSTING_ID" \
        -H "$(bearer "$TOKEN_RECEIVER")" -H 'Content-Type: application/json' \
        -d '{"listingDesc":"Edited while the stored budgets are wrong"}'
else
    echo "  --  skip   PATCH /job-postings/:jobPostingId (no probe posting)"
fi

# ---------------------------------------------------------------------------
# 15. Close job postings (US2-14)
# ---------------------------------------------------------------------------

echo
echo "close job postings"
# A fresh posting, because section 8's has only a rejected proposal and the
# provider cannot send it a second one. Created with api, not snap: POST
# /job-postings has its own tests (US2-6).
api POST /job-postings -H "$(bearer "$TOKEN_RECEIVER")" \
    -H 'Content-Type: application/json' \
    -d '{"listingTitle":"Snapshot Probe job posting to close","listingDesc":"created by scripts/snapshot-api.sh","maxBudget":100000}' >/dev/null
CLOSE_POSTING_ID="$(jget jobPostingId)"
if [ -z "$CLOSE_POSTING_ID" ]; then
    echo "could not create the close probe posting:" >&2
    cat "$BODY" >&2
    exit 1
fi
SUBS+=(--id "job_posting_id=$CLOSE_POSTING_ID")

api POST "/job-postings/$CLOSE_POSTING_ID/proposals" -H "$(bearer "$TOKEN_PROVIDER")" \
    -H 'Content-Type: application/json' \
    -d '{"proposalBudget":90000,"proposalTerms":"Pending until the posting closes.","duration":1}' >/dev/null
CLOSE_PROPOSAL_ID="$(jget proposalId)"
if [ -z "$CLOSE_PROPOSAL_ID" ]; then
    echo "could not create the close probe proposal:" >&2
    cat "$BODY" >&2
    exit 1
fi
SUBS+=(--id "proposal_id=$CLOSE_PROPOSAL_ID")

snap error-job-postings-close-unauthorized POST "/job-postings/$CLOSE_POSTING_ID/close"

snap error-job-postings-close-not-found POST /job-postings/2147483647/close \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T2.14.8: the provider can see the posting but does not own it.
snap error-job-postings-close-forbidden POST "/job-postings/$CLOSE_POSTING_ID/close" \
    -H "$(bearer "$TOKEN_PROVIDER")"

# T2.14.6: the answer is the posting, now CLOSED.
snap job-postings-close POST "/job-postings/$CLOSE_POSTING_ID/close" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# T2.14.6: the proposal was rejected along with it. Nothing reads a proposal's
# status yet, so accept stands in: it checks the proposal before the posting,
# and a still-pending one would fail on the closed posting instead.
snap error-job-postings-close-rejected-proposal POST "/proposals/$CLOSE_PROPOSAL_ID/accept" \
    -H "$(bearer "$TOKEN_RECEIVER")"

# Closing twice is a state conflict, not a second success.
snap error-job-postings-close-again POST "/job-postings/$CLOSE_POSTING_ID/close" \
    -H "$(bearer "$TOKEN_RECEIVER")"

echo
echo "wrote $(find "$OUT_DIR" -name '*.json' | wc -l | tr -d ' ') snapshots to snapshots/"
echo "now run: git diff snapshots/"

