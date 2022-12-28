# Dorayaki-Factory-Server
Server pabrik dorayaki dengan menggunakan REST dan node

### Deskripsi singkat web service
Web Service yang kami buat disimpan dalam repository Dorayaki-Supplier. Web service ini dibuat dengan menggunakan JAX-WS dengan protokol
SOAP dalam Java Servlet. Web service ini menjadi interface pabrik. Ada beberapa layanan:
- Melakukan request pengiriman dorayaki (penambahan stok)
- Membaca status request pengiriman yang dilakukan toko tersebut
- Membaca varian dorayaki yang disediakan pabrik

### Skema basis data yang digunakan
Skema basis data yang digunakan dalam database pabrikdorayaki yaitu:
##### resep
- nama_varian	: varchar (PK)
- bahan_baku	: varchar (PK)
- jumlah		: int
##### bahan_baku
- nama		: varchar (PK)
- stok		: int
##### request
- id            : int (PK)
- nama_varian   : varchar
- jumlah_varian : int 
- status        : int
- ip            : int
- tanggal       : timestamp
##### log_request
- id            : int (PK)
- ip            : int
- endpoint      : varchar
- timestamp     : timestamp
##### User
- email         : varchar
- name          : varchar
- username      : varchar
- password      : varchar
- refreshToken  : text


