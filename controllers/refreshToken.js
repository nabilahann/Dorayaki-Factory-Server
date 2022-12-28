import Users from "../models/userModels.js";
import jwt from "jsonwebtoken";

export const refreshToken = async(req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if(!refreshToken) return res.sendStatus(401); //kalo refresh token tidak ditemukan
        const user = await Users.findAll({ //cari apakah refresh token yang sekarang ada pada database
            where:{
                refresh_token: refreshToken
            }
        });
        //kalo refresh token yang sekarang tidak ada pada database kirim status 403
        if(!user[0]) return res.sendStatus(403); 

        //verifikasi token
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if(err) return res.sendStatus(403);
            const username = user[0].id;
            const name = user[0].name;
            const email = user[0].email;
            const accessToken = jwt.sign({username, name, email}, process.env.ACCESS_TOKEN_SECRET,{
                expiresIn: '20s'
            });
            res.json({ accessToken });
        });
    } catch (error) {
        console.log(error);
    }
}