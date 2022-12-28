import pkg from "sequelize";
const { Sequelize } = pkg;

const db = new Sequelize('pabrikdorayaki','root','jungjunghan',{
    host: "localhost",
    dialect: "mysql"
});

export default db;