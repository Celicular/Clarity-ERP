##This is the current config of an environment where this will be hosted

# PostgreSQL database connection string
DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>"

# JWT signing secret used for authentication tokens
JWT_SECRET="<LONG_RANDOM_JWT_SECRET>"

# Master password for emergency admin access (optional backdoor)
MASTER_PASSWORD="<ADMIN_MASTER_PASSWORD>"

# Public WebSocket fallback URL (used when primary WS fails)
NEXT_PUBLIC_WS_FALLBACK_URL="wss://<WS_HOST>"

# Public company name displayed across UI
NEXT_PUBLIC_COMPANY_NAME="<COMPANY_NAME>"

# Google OAuth / API credentials (calendar + Gmail integrations)
GOOGLE_REFRESH_TOKEN="<GOOGLE_REFRESH_TOKEN>"
GOOGLE_CLIENT_ID="<GOOGLE_OAUTH_CLIENT_ID>"
GOOGLE_CLIENT_SECRET="<GOOGLE_OAUTH_CLIENT_SECRET>"
