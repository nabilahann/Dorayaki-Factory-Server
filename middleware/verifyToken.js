// import jwt from "jsonwebtoken";
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    console.log("masuk auth1");
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if(token == null) return res.sendStatus(401); //kalo token tidak ada return error
    console.log("masuk auth2");
    console.log("body:", req.data);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err) return res.sendStatus(403); //kalo error
        // req.email = decoded.email; //karena kita menyertakan email pada token
        next();
    })
}

module.exports = { verifyToken };