// ======== index.js FINAL PAKAI POSTGRESQL =========
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
require("dotenv").config();
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use("/images", express.static("public/images"));

// ======== Products =========
app.get("/api/products", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM products ORDER BY id ASC");
  res.json(rows);
});

app.get("/api/products/:id", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Produk tidak ditemukan" });
  res.json(rows[0]);
});

app.post("/api/products", async (req, res) => {
  const { name, category, price, image, description } = req.body;
  const result = await db.query(
    "INSERT INTO products (name, category, price, image, description) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [name, category, price, image, description || ""]
  );
  res.status(201).json({ message: "Produk ditambahkan", product: result.rows[0] });
});

app.put("/api/products/:id", async (req, res) => {
  const { name, category, price, image, description } = req.body;
  const result = await db.query(
    "UPDATE products SET name=$1, category=$2, price=$3, image=$4, description=$5 WHERE id=$6 RETURNING *",
    [name, category, price, image, description, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: "Produk tidak ditemukan" });
  res.json({ message: "Produk diperbarui", product: result.rows[0] });
});

app.delete("/api/products/:id", async (req, res) => {
  const result = await db.query("DELETE FROM products WHERE id=$1 RETURNING *", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: "Produk tidak ditemukan" });
  res.json({ message: "Produk dihapus", deleted: result.rows[0] });
});

// ======== Users =========
app.post("/api/signup", async (req, res) => {
  const { name, email, password, image } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Lengkapi semua field!" });
  const check = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  if (check.rows.length > 0) return res.status(409).json({ message: "Email sudah digunakan" });
  const result = await db.query(
    "INSERT INTO users (name, email, password, image) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, email, password, image || null]
  );
  res.status(201).json({ message: "Pendaftaran berhasil", user: result.rows[0] });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query("SELECT * FROM users WHERE email = $1 AND password = $2", [email, password]);
  if (result.rows.length === 0) return res.status(401).json({ message: "Email atau password salah" });
  const user = result.rows[0];
  res.json({ message: "Login berhasil", user: { id: user.id, name: user.name, email: user.email, image: user.image } });
});

app.put("/api/update-user/:email", async (req, res) => {
  const { email } = req.params;
  const { name, password, image } = req.body;
  const result = await db.query(
    "UPDATE users SET name=$1, password=$2, image=$3 WHERE email=$4 RETURNING *",
    [name, password, image, email]
  );
  if (!result.rows[0]) return res.status(404).json({ message: "User tidak ditemukan" });
  res.json({ message: "User berhasil diupdate", user: result.rows[0] });
});

app.delete("/api/delete-user/:email", async (req, res) => {
  const result = await db.query("DELETE FROM users WHERE email=$1 RETURNING *", [req.params.email]);
  if (!result.rows[0]) return res.status(404).json({ message: "User tidak ditemukan" });
  res.json({ message: "User berhasil dihapus", deletedUser: result.rows[0] });
});

app.get("/api/users", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM users");
  res.json(rows);
});

// ======== Cart =========
app.get("/api/cart", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ message: "User ID dibutuhkan" });

  const { rows } = await db.query("SELECT * FROM cart WHERE user_id = $1", [userId]);
  res.json(rows);
});
app.post("/api/cart", async (req, res) => {
  const { product_id, user_id, qty } = req.body;

  // Cek apakah item sudah ada
  const check = await db.query(
    "SELECT * FROM cart WHERE product_id = $1 AND user_id = $2",
    [product_id, user_id]
  );

  if (check.rows.length > 0) {
    // Kalau sudah ada → update qty
    const newQty = check.rows[0].qty + (qty || 1);
    const update = await db.query(
      "UPDATE cart SET qty = $1 WHERE id = $2 RETURNING *",
      [newQty, check.rows[0].id]
    );
    return res.status(200).json(update.rows[0]);
  } else {
    // Kalau belum ada → insert baru
    const result = await db.query(
      "INSERT INTO cart (product_id, user_id, qty) VALUES ($1, $2, $3) RETURNING *",
      [product_id, user_id, qty || 1]
    );
    return res.status(201).json(result.rows[0]);
  }
});

app.patch("/api/cart/:id", async (req, res) => {
  const { qty } = req.body;
  const result = await db.query("UPDATE cart SET qty=$1 WHERE id=$2 RETURNING *", [qty, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: "Item tidak ditemukan" });
  res.json(result.rows[0]);
});

app.delete("/api/cart/:id", async (req, res) => {
  const result = await db.query("DELETE FROM cart WHERE id=$1 RETURNING *", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: "Item tidak ditemukan" });
  res.json({ message: "Item dihapus", deleted: result.rows[0] });
});

app.delete("/api/cart", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ message: "User ID dibutuhkan" });

  await db.query("DELETE FROM cart WHERE user_id = $1", [userId]);
  res.json({ message: "Keranjang dikosongkan untuk user tersebut" });
});


// ======== Addresses =========
app.get("/api/addresses", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM addresses");
  res.json(rows);
});

app.post("/api/addresses", async (req, res) => {
  const { name, address, phone } = req.body;
  const result = await db.query(
    "INSERT INTO addresses (name, address, phone) VALUES ($1, $2, $3) RETURNING *",
    [name, address, phone]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/addresses/:id", async (req, res) => {
  const { name, address, phone } = req.body;
  const result = await db.query(
    "UPDATE addresses SET name=$1, address=$2, phone=$3 WHERE id=$4 RETURNING *",
    [name, address, phone, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: "Alamat tidak ditemukan" });
  res.json(result.rows[0]);
});

app.delete("/api/addresses/:id", async (req, res) => {
  const result = await db.query("DELETE FROM addresses WHERE id=$1 RETURNING *", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: "Alamat tidak ditemukan" });
  res.json({ message: "Alamat dihapus", deleted: result.rows[0] });
});

// ======== Orders =========
app.get("/api/orders", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM orders");
  res.json(rows);
});

app.post("/api/orders", async (req, res) => {
  const { name, items, total, address, payment, date } = req.body;
  const result = await db.query(
    `INSERT INTO orders (name, items, total, address, payment, date, status, courier, trackingNumber)
     VALUES ($1, $2, $3, $4, $5, $6, 'Belum Dibayar', '', '') RETURNING *`,
    [name, items, total, address, payment, date || new Date().toISOString()]
  );
  res.status(201).json({ message: "Pesanan berhasil dibuat", order: result.rows[0] });
});

app.put("/api/orders/:id", async (req, res) => {
  const keys = Object.keys(req.body);
  const values = Object.values(req.body);
  const setQuery = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");
  const query = `UPDATE orders SET ${setQuery} WHERE id=$${keys.length + 1} RETURNING *`;
  const result = await db.query(query, [...values, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  res.json({ message: "Pesanan diupdate", order: result.rows[0] });
});

app.delete("/api/orders/:id", async (req, res) => {
  const result = await db.query("DELETE FROM orders WHERE id=$1 RETURNING *", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  res.json({ message: "Pesanan dihapus", deleted: result.rows[0] });
});

// ======== Draft Orders =========
app.post("/api/checkout/draft", async (req, res) => {
  const draft = {
    id: Date.now().toString(),
    ...req.body,
    paymentStatus: "Belum Dibayar",
    createdAt: new Date().toISOString(),
  };
  const result = await db.query(
    "INSERT INTO draft_orders (id, user_id, items, total, address, payment, paymentStatus, createdAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [draft.id, draft.user_id, draft.items, draft.total, draft.address, draft.payment, draft.paymentStatus, draft.createdAt]
  );
  res.status(200).json(result.rows[0]);
});

app.get("/api/checkout/draft/:id", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM draft_orders WHERE id = $1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Draft tidak ditemukan" });
  res.json(rows[0]);
});

app.get("/api/checkout/drafts", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM draft_orders");
  res.json(rows);
});

app.post("/api/checkout/confirm/:id", async (req, res) => {
  const draft = await db.query("SELECT * FROM draft_orders WHERE id=$1", [req.params.id]);
  if (draft.rows.length === 0) return res.status(404).json({ message: "Draft tidak ditemukan" });

  const confirmed = {
    ...draft.rows[0],
    paymentStatus: "Sudah Dibayar",
    paymentProof: req.body.paymentProof || "",
  };

  await db.query(
    `INSERT INTO orders (name, items, total, address, payment, date, status, courier, trackingNumber)
     VALUES ($1,$2,$3,$4,$5,$6,'Sudah Dibayar','','')`,
    [confirmed.name, confirmed.items, confirmed.total, confirmed.address, confirmed.payment, confirmed.createdat]
  );
  await db.query("DELETE FROM draft_orders WHERE id=$1", [req.params.id]);
  res.status(201).json({ message: "Order berhasil dikonfirmasi", order: confirmed });
});

// ======== Admin Login =========
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === "dani@gmail.com" && password === "admin123") {
    res.json({ admin: { email, role: "admin" } });
  } else {
    res.status(401).json({ message: "Email atau password salah" });
  }
});

// ======== Upload =========
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/images"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Tidak ada file diunggah" });
  res.status(200).json({ imagePath: "/images/" + req.file.filename });
});

// ======== Start Server =========
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});