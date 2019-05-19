const ENV = process.env.DEV === "true" ? '.env.local' : '.env';
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), ENV) });
