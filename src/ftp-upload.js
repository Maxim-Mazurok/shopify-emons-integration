require('./env');

const uploadCSV = (csv, orderId) => {
  const Client = require('ftp');

  const c = new Client();
  c.on('ready', function () {
    c.put(Buffer.from(csv, 'utf8'), `/in/${orderId}.csv`, function (error) {
      if (error) {
        console.error(error);
        return false;
      }
      c.end();
      return true;
    });
  });
  c.connect({
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT || 21,
    secure: process.env.FTP_SECURE === "true" || false, // Set to true for both control and data connection encryption, 'control' for control connection encryption only, or 'implicit' for implicitly encrypted control connection (this mode is deprecated in modern times, but usually uses port 990)
    user: process.env.FTP_USER,
    password: process.env.FTP_PASS,
  });
};

module.exports = {
  uploadCSV
};
