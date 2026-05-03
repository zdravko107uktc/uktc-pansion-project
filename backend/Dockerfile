FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql

RUN set -eux; \
    a2dismod -f mpm_event mpm_worker || true; \
    rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf; \
    rm -f /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf; \
    a2enmod mpm_prefork rewrite; \
    apache2ctl -M | grep mpm_prefork

COPY apache.conf /etc/apache2/sites-available/000-default.conf.template
COPY docker-entrypoint.sh /usr/local/bin/railway-apache-entrypoint
RUN chmod +x /usr/local/bin/railway-apache-entrypoint

COPY public /var/www/html/public
COPY src /var/www/html/src
COPY composer.json composer.lock /var/www/html/
COPY --from=vendor /app/vendor /var/www/html/vendor

EXPOSE 80
ENTRYPOINT ["railway-apache-entrypoint"]
CMD ["apache2-foreground"]
