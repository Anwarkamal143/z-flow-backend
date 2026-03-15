#!/bin/sh
set -e

if [[ "${ENABLE_INNGEST:-false}" != "true" ]]; then
  echo "Skipping Inngest — ENABLE_INNGEST is not true."
  exec "$@"
fi

if [[ "${MODE:-dev}" == "prod" ]]; then
  echo "Running Inngest in production mode..."
  exec inngest start --url http://app:4000/api/inngest
else
  echo "Running Inngest in dev mode..."
  exec inngest dev -u http://app:4000/api/inngest
fi
