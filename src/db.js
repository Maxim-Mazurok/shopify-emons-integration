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

// function addOrder() {
//   const Order = sequelize.define('order', {
//     type: { type: Sequelize.STRING(20) },
//     order: { type: Sequelize.INTEGER, defaultValue: 1 }
//   }, {
//     timestamps: false,
//     underscored: true
//   });
//
//   Order.__factory = { autoIncrementField: 'id' };
//   Order.id = '';
//
//   // sequelize.query('INSERT INTO pages SET `type` = ?, `order` = ?, `topic_version_id` = ?', Order, { raw: false }, ['TEXT', 1, 1])
//   //   .success(function (page) {
//   //     console.log(page)
//   //     Order.find(page.id)
//   //       .success(function (result) {
//   //         console.log(result)
//   //       })
//   //
//   //   })
// }

//
// class User extends Sequelize.Model {
// }
//
// User.init({
//   username: Sequelize.STRING,
//   birthday: Sequelize.DATE
// }, { sequelize, modelName: 'user' });
//
// sequelize.sync()
//   .then(() => User.create({
//     username: 'janedoe',
//     birthday: new Date(1980, 6, 20)
//   }))
//   .then(jane => {
//     console.log(jane.toJSON());
//   });
