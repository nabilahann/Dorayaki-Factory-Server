import pkg from 'sequelize';
const { Sequelize } = pkg;
import db from "../config/database.js";

const { DataTypes } = Sequelize;

const Users = db.define('user',{
    email:{
        type: DataTypes.STRING
    },
    name:{
        type: DataTypes.STRING
    },
    username:{
        type: DataTypes.STRING
    },
    password:{
        type: DataTypes.STRING
    },
    refreshToken:{
        type: DataTypes.TEXT
    }
},{
    freezeTableName:true
});

export default Users;