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

# Start Nginx in the foreground – Cloud Run keeps the container alive.
# Nginx binds port 8080 immediately so the Cloud Run startup probe succeeds.
# API proxy requests will return 502 for the brief moment Express is still
# initialising, but that window is typically under a second.
exec nginx -g 'daemon off;'
