import Users from "../models/userModels.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const getUsers = async(req, res) => {
    try {
        const users = await Users.findAll({
            attributes:['id','name','email'] //data yang akan ditampilkan/kirim cuma ini
        });
        res.json(users);
    } catch (error) {
        console.log(error);
    }
}

export const Register = async(req, res) => {
    const { name, email, password, confPassword } = req.body;
    if(password !== confPassword) return res.status(400).json({msg: "Password dan Confirm Password tidak cocok"});
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);
    try {
        await Users.create({
            name: name,
            email: email,
            password: hashPassword
        });
        res.json({msg: "Register Akun Berhasil"}); //respone akan diberikan ke client
    } catch (error) {
        console.log(error);
    }
}


export const Login = async(req, res) => {
    console.log(req.body.email);
    try {
        const user = await Users.findAll({ //didapatkan single data karena suatu email hanya umtuk 1 akun
            where:{
                email: req.body.email //pencarian dari databse berdasarkan email
            }
        });

        // console.log('masuk');

        // req.body.password : dari client,  user[0].password : dari database
        const match = await bcrypt.compare(req.body.password, user[0].password);
        if(!match) return res.status(400).json({msg: "Wrong Password"}); //kalo password salah
        const userId = user[0].id;
        const name = user[0].name;
        const email = user[0].email;
        const accessToken = jwt.sign({userId, name, email}, process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: '60s' //token akan expired dalam waktu 20 detik
        });
        const refreshToken = jwt.sign({userId, name, email}, process.env.REFRESH_TOKEN_SECRET,{
            expiresIn: '1d' //token akan expired dalam waktu 1 hari
        });
        await Users.update({refresh_token: refreshToken},{
            where:{
                email: email
            }
        });
        res.cookie('refreshToken', refreshToken,{
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 //expired cookie => 1 hari (maxAge dalam milisekon)
        });
        res.json({ accessToken }); //kirimkan ke client token
    } catch (error) { //kalo email tidak ada pada database
        res.status(404).json({msg:"Email tidak ditemukan"});
    }
}

export const Logout = async(req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken) return res.sendStatus(204); //kalo token tidak ada
    const user = await Users.findAll({ //cari token pada database
        where:{
            refresh_token: refreshToken
        }
    });
    if(!user[0]) return res.sendStatus(204); //token yang diberikan tidak ada/tidak cocok dengan yg ada pada database
    const email = user[0].email;
    await Users.update({refresh_token: null},{ //update refresh_token jadi null -> menandakan dia sedang tidak login
        where:{
            email: email
        }
    });
    res.clearCookie('refreshToken'); //hapus cookie
    return res.sendStatus(200); //kirimkan status sukses
}