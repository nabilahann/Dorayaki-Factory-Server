const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const saltRounds = 10;
const { verifyToken } = require("./middleware/verifyToken");

dotenv.config();

app.use(cors({ credentials:true, origin:'http://localhost:3000' }));
app.use(express.json());
app.use(cookieParser());

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "jungjunghan",
  database: "pabrikdorayaki",
});

app.post("/register", (req, res) => {
    const { email, name, username, password } = req.body;

    //verifikasi email
    const regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    // console.log("masuk")
    if((email.length != 0) && (!regex.test(email))){
      return res.status(400).json({msg: "Email tidak valid"});
    }
    // console.log("masuk 2")

    //verifikasi username
    db.query(
      "SELECT * FROM user WHERE username = ?", 
      [username],
      (err, result) => {
        if (err) {
          //username valid
          console.log(err);
        } else {
          console.log(result);
          if(result.length != 0){
            return res.status(400).json({msg: "Username sudah digunakan"});
          }
        }
    });

    // console.log("masuk 3")
    const salt = bcrypt.genSaltSync(saltRounds);
    const hashPassword = bcrypt.hashSync(password, salt);
    console.log(hashPassword)
    
  
    /* tambahkan data user ke basis data */
    db.query(
      "INSERT INTO user (email, name, username, password) VALUES (?,?,?,?)",
      [email, name, username, hashPassword],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log("success regis");
          res.json({msg: "Register Akun Berhasil"});
        }
      }
    );
});

app.post("/login", (req, res) => {
  username = req.body.username;
  console.log(username);

  //ambil data berdasarkan masukan username (username, email, nama, password)
  db.query(
    "SELECT email, name, password, username FROM user WHERE username = ?",
    [username],
    (err, result) => {
      if (err) {
        console.log(err);
        
        // return res.status(400).json({msg: "Wrong Username"});
      } else {
        //data tidak ditemukan
        if(result.length == 0){
          return res.status(400).json({msg: "Wrong Username"});
        } 
        //bandingkan password yang dimasukkan dengan password pada basis sata
        const match = bcrypt.compareSync(req.body.password, result[0].password);

        //kalo password salah
        if(!match) return res.status(400).json({msg: "Wrong Password"}); 

        const username = result[0].username;
        const name = result[0].name;
        const email = result[0].email;

        //bikin accessToken
        const accessToken = jwt.sign({username, name, email}, process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: '60s' //token akan expired dalam waktu 20 detik
        });

        //bikin refresh token
        const refreshToken = jwt.sign({username, name, email}, process.env.REFRESH_TOKEN_SECRET,{
            expiresIn: '1d' //token akan expired dalam waktu 1 hari
        });

        db.query(
          "UPDATE user SET refreshToken = ? WHERE username = ?",
          [refreshToken, username],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              console.log("success part 2");
            }
          }
        );
        
        res.cookie('refreshToken', refreshToken,{
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 //expired cookie => 1 hari (maxAge dalam milisekon)
        });
        res.json({ accessToken }); //kirimkan ke client token

      }
    }
  );

});

app.get("/token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if(!refreshToken) return res.sendStatus(401); //kalo refresh token tidak ditemukan pada cookies

  //cari apakah refresh token yang sekarang ada pada database
  db.query(
      "SELECT * FROM user WHERE refreshToken = ?", 
      [refreshToken],
      (err, result) => {
        if (err) {
          console.log(err);
          //kalo refresh token yang sekarang tidak ada pada database kirim status 403
          return res.sendStatus(204);
        } else {
          //kalo refresh token yang sekarang tidak ada pada database kirim status 403
          if(result.length == 0){
            return res.sendStatus(403);
          }
          // res.send(result);

          //verifikasi token
          jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if(err) return res.sendStatus(403);
              const username = result[0].username;
              const name = result[0].name;
              const email = result[0].email;
              const accessToken = jwt.sign({username, name, email}, process.env.ACCESS_TOKEN_SECRET,{
                  expiresIn: '20s'
              });
              res.json({ accessToken });
            });
        }
  });
});

app.delete("/logout", (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken) return res.sendStatus(204); //kalo token tidak ada

    db.query(
      "SELECT * FROM user WHERE refreshToken = ?", 
      [refreshToken],
      (err, result) => {
        if (err) {
          console.log(err);
          //token yang diberikan tidak ada/tidak cocok dengan yg ada pada database
          return res.sendStatus(204);
        } else {
          const username = result[0].username;
          //update refresh_token jadi null -> menandakan dia sedang tidak login
          db.query(
            "UPDATE user SET refreshToken = ? WHERE username = ?",
            [null, username],
            (err, result) => {
              if (err) {
                console.log(err);
              } else {
                console.log("success part 3");
              }
            }
          );

          res.clearCookie('refreshToken'); //hapus cookie
          return res.sendStatus(200); //kirimkan status sukses
          }
        }
    ); 
});

app.post("/addRecipe", (req, res) => {
  const name = req.body.name;
  const bahanbaku = req.body.inputBahanBaku;

  bahanbaku.forEach((bahan) => {
    /* tambahkan dulu bahan baku yang belum ada di basis data */
    db.query("INSERT IGNORE INTO bahan_baku (nama, stok) VALUES (?,?)", [
      bahan.namaBahan.toLowerCase(),
      0,
    ]);

    /* tambahkan resep baru ke basis data */
    db.query(
      "INSERT INTO resep (nama_varian, bahan_baku, jumlah) VALUES (?,?,?)",
      [name.toLowerCase(), bahan.namaBahan.toLowerCase(), bahan.banyak],
      (err, result) => {
        if (err) {
          console.log(err);
        } else {
          res.send("Values Inserted");
        }
      }
    );
  });
});

app.get("/recipes", (req, res) => {
  db.query("SELECT DISTINCT nama_varian FROM resep", (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log(result);
      res.send(result);
    }
  });
});

app.get("/detail", (req, res) => {
  const variant = req.query.variant;
  console.log(variant);
  db.query(
    "SELECT * FROM resep WHERE nama_varian = ?",
    [variant],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        res.send(result);
      }
    }
  );
});

app.get("/accept", verifyToken, (req, res) => {
  const id = req.query.id;
  const nama_varian = req.query.nama_varian;
  const jumlah_varian = req.query.jumlah_varian;
  console.log(id)
  const stok = [];

  
  db.query(
    "SELECT bahan_baku, jumlah FROM resep WHERE nama_varian = ?",
    [nama_varian],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.sendStatus(204);
      } else {
        //data didapatkan
        console.log(result);
        // hasil = result;

        //cek stok bahan baku
        result.map((element, index) => { 
          //cek stok bahan baku satu per satu
          const total = element.jumlah * jumlah_varian;
          console.log("total:",total)
          db.query(
            "SELECT stok FROM bahan_baku WHERE nama = ?",
            [element.bahan_baku],
            (err, res) => {
              if (err) {
                console.log(err);
                return res.sendStatus(204);
              } else {
                console.log("stok", res[0].stok)
                if(total > res[0].stok){
                  //kalo stok tidak mencukupi
                  return res.sendStatus(403);
                } else {
                  stok.push(res[0].stok);
                  console.log("masuk");
                }
              }
            })
        })
        console.log("selesai cek")
        console.log(stok);

        //update stok
        // const i = 0;
        // result.map((element, index) => {
        //     //update stok pada databse
        //     // const perubahan = element.jumlah - stok[i];
        //     // console.log("perubahan:", perubahan)

        //     const number = parseInt(element.jumlah);
        //     const perubahan = stok[i] - number;
        //     console.log("perubahan:", perubahan)
        //     // db.query(
        //     //   "UPDATE bahan_baku SET stok = stok - ? WHERE nama = ?",
        //     //   [stok[i], element.bahan_baku],
        //     //   (err, res) => {
        //     //     if (err) {
        //     //       console.log(err);
        //     //       console.log("gagal update");
        //     //       return res.sendStatus(204);
        //     //     } else{
        //     //       console.log("berhasil update stok bahan baku")
        //     //     }
        //     // })
        //     // i++;
        // })

      }
    }
  );

  
  
  //update status done
  db.query(
    "UPDATE request SET status = 1 WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log("success accept");
      }
    }
  );
});


app.get("/decline", verifyToken, (req, res) => {
  const id = req.query.id;
  console.log(id)
  
  //update status done
  db.query(
    "UPDATE request SET status = 1 WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log("success declien");
      }
    }
  );
});

app.get("/request", verifyToken, (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if(!refreshToken) return res.sendStatus(401); //kalo refresh token tidak ditemukan pada cookies

  db.query(
    "SELECT id, ip, nama_varian, jumlah_varian, status, tanggal FROM request",
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        res.send(result);
      }
    }
  );
});

app.get("/sortRequest", verifyToken, (req, res) => {
  const sort = req.query.sortby;
  console.log("sort:", sort)
  db.query(
    "SELECT id, ip, nama_varian, jumlah_varian, status, tanggal FROM request ORDER BY ? ASC",
    [sort],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        res.send(result);
      }
    }
  );
})

function myFunction(item, index) {
  text += index + ": " + item + "<br>"; 
}

app.get("/searchRequest", verifyToken, (req, res) => {
  console.log("masuk search")
  const key = req.query.key;

  const k = key.toLowerCase();
  const k2 = "%" + k + "%";

  console.log("k2:",k2);

  db.query(
    "SELECT id, ip, nama_varian, jumlah_varian, status, tanggal FROM request WHERE nama_varian LIKE ?",
    [k2],
    (err, result) => {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
        res.send(result);
      }
    }
  );
})
app.post("/addIngredient", async (req, res) => {
  const bahan = req.body.name;
  const stock = req.body.stock;

  db.query("INSERT IGNORE INTO bahan_baku (nama, stok) VALUES (?,?)", [
     bahan.toLowerCase(),
     stock,
  ]);
})

app.get("/ingredients", (req, res) => {
  db.query("SELECT * FROM bahan_baku", (err, result) => {
     if (err) {
       console.log(err);
     } else {
       res.send(result);
     }
  });
});

app.post("/updateStock", async (req, res) => {
  const bahan = req.body.name;
  const stock = req.body.stock;

  db.query("UPDATE bahan_baku SET stok = (?) WHERE nama = (?)", [
     stock,
     bahan.toLowerCase(),
  ]);
});

app.listen(3001, () => {
  console.log("This server is running on port 3001");
});
