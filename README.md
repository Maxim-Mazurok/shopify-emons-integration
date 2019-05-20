# Shopify Emons Integration
This project uses [Shopify webhooks](https://help.shopify.com/en/api/getting-started/webhooks)
to parse orders from Shopify, produce CSV format required by [Emons](https://www.emons.de/)
and upload CSV to the Emons's FTP server.

# Requirements
- NodeJS (tested on v10.15.3, see `engines` section of `package.json`)
- MySQL (tested on v5.7.18)
- Shopify "Order payment" webhook. [Learn more](https://help.shopify.com/en/api/getting-started/webhooks#configuring-webhooks) about setting it up.
- SSL (https) - required by Shopify. You can use [ngrok](https://github.com/inconshreveable/ngrok) for local testing

# Configuration
Copy `.env.example` to `.env` file:
```bash
cp .env.example .env
```

Change parameters accordingly.

- MySQL:
  - `DB_USER` - *required* - username
  - `DB_PASS` - *required* - password
  - `DB_NAME` - *required* - database name
  - `DB_HOST` - IP or domain name, defaults to `localhost`
  - `DB_PORT` - port, defaults to `3306`
  - `FORCE_DB_SYNC` - set to `true` if you want to reset you DB **will RESET your orders table** (i.e., delete all orders)
- SSL/HTTP:
  - `SSL_PRIVATE_KEY` - *required for production* - full path to your private key (`-----BEGIN PRIVATE KEY-----`...)
  - `SSL_CERTIFICATE` - *required for production* - full path to your certificate (`-----BEGIN CERTIFICATE-----`...)
  - `HTTP_PORT` - port for listening to HTTP requests (helpful for local testing), defaults to `80`
  - `HTTPS_PORT` - port for listening to HTTPS requests, default to `443`
  - `USE_HTTPS` - whether to use HTTPS or not (helpful for local testing), defaults to `false`
- Shopify:
  - `SHOPIFY_WEBHOOK_SECRET` - *required* - token used to validate webhooks, can be found at [https://yourstore.myshopify.com/admin/settings/notifications](https://yourstore.myshopify.com/admin/settings/notifications) (replace `yourstore` in url) 
  - `SHOP_DOMAIN` - *required* - used to validate webhooks
- FTP:
  - `FTP_USER` - *required* - username
  - `FTP_PASS` - *required* - password
  - `FTP_HOST` - where to upload CSV files, defaults to `ftp.emons.de`
  - `FTP_PORT` - ftp port, defaults to `21`
  - `FTP_SECURE` - use FTPS or not, defaults to `false`
