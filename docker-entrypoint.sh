#!/bin/sh
set -e

# Cloud Run sets PORT (default 8080). Express runs internally on 3001.
PORT=${PORT:-8080}
export PORT

# Template the nginx config so it listens on the correct port.
# Only ${PORT} is substituted; nginx variables like $host are left intact.
# Alpine Linux's nginx reads from http.d/, not conf.d/.
envsubst '${PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Start the Express API server on port 3001 (proxied internally by Nginx)
PORT=3001 node /app/server/index.js &

# Wait for Express to be ready before starting Nginx.
# Without this, any request that arrives during Express initialisation
# (including Cloud Run cold-start requests) is proxied to a port that is
# not yet listening, causing Nginx to return 502.
echo "Waiting for Express API to be ready..."
RETRIES=50
i=0
while [ $i -lt $RETRIES ]; do
  if wget -qO- http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo "Express API is ready"
    break
  fi
  i=$((i + 1))
  if [ $i -eq $RETRIES ]; then
    echo "Express API failed to start after ${RETRIES}s – aborting" >&2
    exit 1
  fi
  sleep 1
done

# Start Nginx in the foreground – Cloud Run keeps the container alive
exec nginx -g 'daemon off;'
