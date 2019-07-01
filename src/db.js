require('./env');

const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS, {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
  });

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const addOrder = json => {
  return new Promise(((resolve, reject) => {
    const Order = sequelize.define('order', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      json: { type: Sequelize.TEXT }
    }, {
      timestamps: false,
      underscored: true
    });
    Order.sync({ force: process.env.FORCE_DB_SYNC === "true" || false }).then(() => {
      Order.create({ id: '', json }).then(order => {
        resolve(order.id);
      })
    }).catch(error => {
      console.error(error);
      reject(error);
    });
  }));
};

module.exports = {
  addOrder
};
