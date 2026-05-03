#!/bin/sh
set -eu

PORT="${PORT:-80}"

sed "s/__APACHE_PORT__/${PORT}/g" \
    /etc/apache2/sites-available/000-default.conf.template \
    > /etc/apache2/sites-available/000-default.conf

printf 'Listen %s\n' "$PORT" > /etc/apache2/ports.conf

exec docker-php-entrypoint "$@"
