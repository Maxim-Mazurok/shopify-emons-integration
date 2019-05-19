require('./env');

const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const FastestValidator = require("fastest-validator");
const validator = new FastestValidator();
const csvWriter = require('csv-writer');
const nestedProperty = require("nested-property");

const app = express();
app.use(bodyParser.text({ type: 'json' }));

app.post('/', (req, res) => {
  res.end();

  console.log(req.body);
  const json = JSON.parse(req.body);
  console.log(json);
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

    // if (checkOrder(json)) {
    //   console.log('ok');
    console.log(buildCSV(parseOrder(json)));
    // } else {
    //   console.log('not ok')
    // }
  }
});

// function checkOrder(json) {
//   const schema = {
//     customer: {
//       type: "object", props: {
//         email: { type: "string", optional: true },
//         first_name: { type: "string", optional: true },
//         last_name: { type: "string", optional: true },
//       }
//     },
//   };
//
//   return validator.validate(json, schema);
// }

function parseOrder(json) {
  const getAddress = json => {
    const address1 = nestedProperty.get(json, 'shipping_address.address1');
    const address2 = nestedProperty.get(json, 'shipping_address.address2');
    return address2 ? `${address1}; ${address2}` : address1;
  };

  return {
    firstName: (nestedProperty.get(json, 'customer.first_name') || '').substring(0, 100),
    lastName: (nestedProperty.get(json, 'customer.last_name') || 'Anonymous').substring(0, 100),
    address: (getAddress(json) || 'No address').substring(0, 100),
    country_code: (nestedProperty.get(json, 'shipping_address.country_code') || 'NONE').substring(0, 10),
    zip: (nestedProperty.get(json, 'shipping_address.zip') || 'NONE').substring(0, 10),
    city: (nestedProperty.get(json, 'shipping_address.city') || 'NONE').substring(0, 100),
    email: (nestedProperty.get(json, 'customer.email') || '').substring(0, 100),
    phone: (nestedProperty.get(json, 'shipping_address.phone') || '').substring(0, 50),
  }
}

function buildCSV(inputData) {
  const data = {
    header: '#H', // type: `#H` - shipping address; `#L` not need, you can skip this; `#P` - contains the goods
    id: '', // delivery receipt number //TODO: get from DB
    date: '', // delivery date, if no delivery date is specified, Emons deliver as soon as possible
    lastName: inputData.lastName,
    firstName: inputData.firstName,
    address: inputData.address, // street with house number
    country_code: inputData.country_code,
    zip: inputData.zip,
    city: inputData.city,
    document_number: '', // document number is optional and IDK what that means. Seems like SKU to me, i.e. A10054
    email: inputData.email,
    phone: inputData.phone,
  };

  const schema = {
    header: { type: "string", min: 2, max: 2 },
    id: { type: "string", min: 1, max: 50 },
    date: { type: "string", min: 0, max: 10 },
    lastName: { type: "string", min: 1, max: 10 },
    firstName: { type: "string", min: 0, max: 100 },
    address: { type: "string", min: 1, max: 100 },
    country_code: { type: "string", min: 1, max: 10 },
    zip: { type: "string", min: 1, max: 10 },
    city: { type: "string", min: 1, max: 100 },
    document_number: { type: "string", min: 0, max: 100 },
    email: { type: "string", min: 0, max: 100 },
    phone: { type: "string", min: 0, max: 50 },
  };

  if (validator.validate(data, schema)) {
    const csvStringifier = csvWriter.createObjectCsvStringifier({
      header: [
        { id: 'header' },
        { id: 'id' },
        { id: 'date' },
        { id: 'lastName' },
        { id: 'firstName' },
        { id: 'address' },
        { id: 'country_code' },
        { id: 'zip' },
        { id: 'city' },
        { id: 'document_number' },
        { id: 'email' },
        { id: 'phone' },
      ]
    });

    return csvStringifier.stringifyRecords([data]);
  } else {
    return 'invalid data';
  }
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