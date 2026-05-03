FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql

RUN a2dismod mpm_event || true \
    && a2enmod mpm_prefork rewrite

COPY apache.conf /etc/apache2/sites-available/000-default.conf

COPY public /var/www/html/public
COPY src /var/www/html/src
COPY composer.json composer.lock /var/www/html/
COPY --from=vendor /app/vendor /var/www/html/vendor

EXPOSE 80
