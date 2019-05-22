require('./env');

const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const Validator = require("fastest-validator");
const csvWriter = require('csvwriter');
const nestedProperty = require("nested-property");
const { uploadCSV } = require("./ftp-upload");
const { addOrder } = require("./db");

const csvWriterOptions = {
  header: false,
  delimiter: '|',
  decimalSeparator: ',',
  crlf: true,
};

const app = express();
app.use(bodyParser.text({ type: 'json' }));

app.post('/', (req, res) => {
  res.end();

  const rawJSON = req.body;
  const json = JSON.parse(req.body);
  const XShopifyTopic = req.get('X-Shopify-Topic');
  const XShopifyHmacSha256 = req.get('X-Shopify-Hmac-Sha256');
  const XShopifyShopDomain = req.get('X-Shopify-Shop-Domain');
  const hash = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(req.body)
    .digest('base64');
  if (
    XShopifyTopic === 'orders/paid' &&
    XShopifyShopDomain === process.env.SHOP_DOMAIN &&
    XShopifyHmacSha256 === hash
  ) {
    // data is signed correctly

    if (checkOrder(json) === true) {
      buildCSV(parseOrder(json), rawJSON)
        .then(data => console.log(uploadCSV(data.csv, data.orderId)))
        .catch(error => console.error(error));
    } else {
      console.log('data is not ok')
    }
  }
});

function checkOrder(json) {
  const schema = {
    customer: {
      type: "object", optional: true, props: {
        first_name: { type: "string", optional: true },
        last_name: { type: "string", optional: true },
        email: { type: "string", optional: true },
      }
    },
    shipping_address: {
      type: "object", optional: true, props: {
        address1: { type: "string", optional: true },
        address2: { type: "string", optional: true },
        country_code: { type: "string", optional: true },
        zip: { type: "string", optional: true },
        city: { type: "string", optional: true },
        phone: { type: "string", optional: true },
      }
    },
    line_items: {
      type: "array", min: 1, optional: true, items: {
        type: "object", props: {
          product_id: { type: "number", optional: true },
          quantity: { type: "number", optional: true },
          grams: { type: "number", optional: true },
        }
      }
    },
    order_number: { type: "number", optional: true }
  };
  if (process.env.DEV !== "true") {
    schema.financial_status = { type: "string", pattern: /^paid$/g }; // process only paid orders
  }

  const v = new Validator();
  return v.validate(json, schema);
}

function parseOrder(json) {
  const getAddress = json => {
    const address1 = nestedProperty.get(json, 'shipping_address.address1');
    const address2 = nestedProperty.get(json, 'shipping_address.address2');
    return address2 ? `${address1}; ${address2}` : address1;
  };

  return {
    firstName: (nestedProperty.get(json, 'customer.first_name') || '').toString().substring(0, 100).replace(/['"]/g, ''),
    lastName: (nestedProperty.get(json, 'customer.last_name') || 'Anonymous').toString().substring(0, 100).replace(/['"]/g, ''),
    company: (nestedProperty.get(json, 'shipping_address.company') || '--').toString().substring(0, 100).replace(/['"]/g, ''),
    address: (getAddress(json) || 'No address').toString().substring(0, 100).replace(/['"]/g, ''),
    country_code: (nestedProperty.get(json, 'shipping_address.country_code') || 'NONE').toString().substring(0, 10).replace(/['"]/g, ''),
    zip: (nestedProperty.get(json, 'shipping_address.zip') || 'NONE').toString().substring(0, 10).replace(/['"]/g, ''),
    city: (nestedProperty.get(json, 'shipping_address.city') || 'NONE').toString().substring(0, 100).replace(/['"]/g, ''),
    email: (nestedProperty.get(json, 'customer.email') || '').toString().substring(0, 100).replace(/['"]/g, ''),
    phone: (nestedProperty.get(json, 'shipping_address.phone') || '').toString().substring(0, 50).replace(/['"]/g, ''),
    lineItems: (json.line_items || []).map(item => ({
      product_id: (nestedProperty.get(item, 'product_id') || "NONE").toString().substring(0, 50).replace(/['"]/g, ''),
      quantity: parseInt((nestedProperty.get(item, 'quantity') || 1).toString().substring(0, 9).replace(/['"]/g, '')),
      grams: parseInt((nestedProperty.get(item, 'grams') || 0).toString().substring(0, 50).replace(/['"]/g, '')),
      requires_shipping: nestedProperty.get(item, 'requires_shipping') || false,
    })),
    invoice: (nestedProperty.get(json, 'order_number') || "NONE").toString().substring(0, 50).replace(/['"]/g, ''),
  }
}

function buildCSV(inputData, json) {
  return new Promise((resolve, reject) => {
    const header = {
      header: '#H', // type: `#H` - shipping address; `#L` supplier, we can skip this; `#P` - contains the goods
      id: '', // delivery receipt number, being set later in code, from DB
      date: '', // delivery date, if no delivery date is specified, Emons deliver as soon as possible
      company: inputData.company,
      fullName: inputData.firstName + " " + inputData.lastName,
      address: inputData.address, // street with house number
      country_code: inputData.country_code,
      zip: inputData.zip,
      city: inputData.city,
      document_number: '', // document number is optional and IDK what that means. Seems like SKU to me, i.e. A10054
      email: inputData.email,
      phone: inputData.phone,
    };

    const lineItems = (inputData.lineItems || [])
      .filter(item => item.requires_shipping === true)
      .map((item, index) => ({
        header: '#P',
        invoice: inputData.invoice,
        index: parseInt((index + 1).toString().substring(0, 9).replace(/['"]/g, '')),
        product_id: item.product_id,
        quantity: item.quantity,
        charge: undefined,
        serialNumber: undefined,
        mass: item.grams,
        storageArea: undefined,
        orderNumber: undefined,
      }));

    const headerSchema = {
      header: { type: "string", min: 2, max: 2 },
      id: { type: "string", min: 1, max: 50 },
      date: { type: "string", min: 0, max: 10 },
      company: { type: "string", min: 1, max: 100 },
      fullName: { type: "string", min: 0, max: 100 },
      address: { type: "string", min: 1, max: 100 },
      country_code: { type: "string", min: 1, max: 10 },
      zip: { type: "string", min: 1, max: 10 },
      city: { type: "string", min: 1, max: 100 },
      document_number: { type: "string", min: 0, max: 100 },
      email: { type: "string", min: 0, max: 100 },
      phone: { type: "string", min: 0, max: 50 },
    };

    const lineItemsSchema = {
      header: { type: "string", min: 2, max: 2 },
      invoice: { type: "string", min: 1, max: 50 },
      index: { type: "number", positive: true, integer: true, min: 0, max: 999999999 },
      product_id: { type: "string", min: 1, max: 50 },
      quantity: { type: "number", positive: true, integer: true, min: 0, max: 999999999 },
      charge: { type: "string", min: 0, max: 100, optional: true }, // ???
      serialNumber: { type: "string", min: 0, max: 100, optional: true },
      mass: { type: "number", min: 0, max: 99999999999999999999999999999999999999999999999999, optional: true },
      storageArea: { type: "string", min: 0, max: 10, optional: true },
      orderNumber: { type: "string", min: 0, max: 50, optional: true },
    };

    const v = new Validator();

    if (!v.validate(header, headerSchema) || !v.validate(lineItems, lineItemsSchema)) {
      reject('invalid data');
    }

    addOrder(json)
      .then(orderId => {
        header.id = orderId;
        csvWriter(header, csvWriterOptions, function (error, headerCSV) {
          if (error) {
            console.error(error);
            reject('error writing csv');
          }

          csvWriter(lineItems, csvWriterOptions, function (error, lineItemsCSV) {
            if (error) {
              console.error(error);
              reject('error writing csv');
            }

            const csv = headerCSV + lineItemsCSV;
            console.log(csv);
            resolve({
              csv,
              orderId,
            });
          });
        });
      })
      .catch(error => {
        console.error(error);
        reject('error adding order to DB');
      });
  });
}

http.createServer(app).listen(process.env.HTTP_PORT || 80);

if (process.env.USE_HTTPS !== "false") {
  const fs = require('fs');
  const privateKey = fs.readFileSync(process.env.SSL_PRIVATE_KEY, 'utf8');
  const certificate = fs.readFileSync(process.env.SSL_CERTIFICATE, 'utf8');

  https.createServer({
    key: privateKey,
    cert: certificate,
  }, app).listen(process.env.HTTPS_PORT || 443);
}
