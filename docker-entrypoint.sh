#!/bin/sh
set -e

# Cloud Run sets PORT (default 8080). Express runs internally on 3001.
PORT=${PORT:-8080}
export PORT

# Template the nginx config so it listens on the correct port.
# Only ${PORT} is substituted; nginx variables like $host are left intact.
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start the Express API server on port 3001 (proxied internally by Nginx)
PORT=3001 node /app/server/index.js &

# Wait for Express to be ready before starting Nginx
echo "Waiting for Express API to be ready..."
for i in $(seq 1 30); do
  if wget -qO- http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo "Express API is ready"
    break
  fi
  sleep 1
done

# Start Nginx in the foreground – Cloud Run keeps the container alive
exec nginx -g 'daemon off;'
