#!/bin/sh
set -e

# Cloud Run sets PORT (default 8080). Express runs internally on 3001.
PORT=${PORT:-8080}
export PORT

# Template the nginx config so it listens on the correct port.
# Only ${PORT} is substituted; nginx variables like $host are left intact.
envsubst '${PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Start the Express API server on port 3001 (proxied internally by Nginx)
PORT=3001 node /app/server/index.js &

# Wait for the Express backend to be ready before starting Nginx.
# Without this, any request that arrives during Express initialisation
# (including Cloud Run cold-start requests) is proxied to a port that is
# not yet listening, causing Nginx to return 502.
# Express typically starts in well under a second; Cloud Run's startup
# probe retries for up to 240 s, so this brief delay is safe.
RETRIES=50
until wget -qO- http://127.0.0.1:3001/health > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -eq 0 ]; then
    echo "ERROR: Express API did not become ready in time" >&2
    exit 1
  fi
  sleep 0.1
done

# Start Nginx in the foreground – Cloud Run keeps the container alive.
exec nginx -g 'daemon off;'
