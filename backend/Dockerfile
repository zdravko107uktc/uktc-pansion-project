FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql

RUN set -eux; \
    if a2query -m mpm_event >/dev/null 2>&1; then \
        a2dismod mpm_event; \
    fi; \
    a2enmod mpm_prefork rewrite

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
