#!/bin/sh
set -eu

PORT="${PORT:-80}"

rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf
rm -f /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf

if [ ! -L /etc/apache2/mods-enabled/mpm_prefork.load ]; then
    a2enmod mpm_prefork
fi

sed "s/__APACHE_PORT__/${PORT}/g" \
    /etc/apache2/sites-available/000-default.conf.template \
    > /etc/apache2/sites-available/000-default.conf

printf 'Listen %s\n' "$PORT" > /etc/apache2/ports.conf

exec docker-php-entrypoint "$@"
