FROM php:8.2-apache

# Instalasi ekstensi GD untuk verifikasi gambar raster (PNG, JPG, WEBP)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg-dev \
    libwebp-dev \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Aktifkan modul Apache yang diperlukan untuk proteksi dan header
RUN a2enmod rewrite headers

# Konfigurasi Apache DocumentRoot dengan AllowOverride All dan DirectoryIndex
RUN printf '<Directory /var/www/html>\n\
    Options -Indexes +FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
    DirectoryIndex index.html index.php\n\
</Directory>\n' > /etc/apache2/conf-available/peroni-portal.conf \
    && a2enconf peroni-portal

# Direktori kerja
WORKDIR /var/www/html

# Salin source code proyek
COPY . /var/www/html/

# Terapkan permission spesifik:
# - Direktori umum: 755
# - File umum: 644
# - Direktori data dan uploads (butuh write www-data): 775
# - File data dan uploads: 664
RUN chown -R www-data:www-data /var/www/html \
    && find /var/www/html -type d -exec chmod 755 {} + \
    && find /var/www/html -type f -exec chmod 644 {} + \
    && if [ -d /var/www/html/data ]; then \
        find /var/www/html/data -type d -exec chmod 775 {} + && \
        find /var/www/html/data -type f -exec chmod 664 {} +; \
    fi

EXPOSE 80

CMD ["apache2-foreground"]
