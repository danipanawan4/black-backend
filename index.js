// backend/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use("/images", express.static("public/images"));

// ======== Dummy Products =========
let products = [
  { id: 1, name: "Intel Core i5 12400F", category: "Processor", price: 2800000, image: "/images/processor.png", description: "Prosesor Intel generasi ke-12 dengan 6-core untuk performa gaming dan multitasking." },
  { id: 2, name: "Corsair Vengeance 16GB", category: "RAM", price: 950000, image: "/images/ram.png", description: "RAM DDR4 Corsair 16GB 3200MHz cocok untuk gaming dan produktivitas." },
  { id: 3, name: "MSI B660M Mortar", category: "Motherboard", price: 1850000, image: "/images/motherboard.png", description: "akakakaksjaskdakjakjgfakgfakgfakjsgkjjjjjjjjjjj" },
  { id: 4, name: "SSD 256 GB", category: "Storage", price: 800000, image: "/images/ssd.png", description: "kajdddddddddddddddddddddddddddddddddddd" }
];

let cart = [];
let addresses = [];
let orders = [];
let draftOrders = [];
let users = [];

// ======== Products =========
app.get("/api/products", (req, res) => res.json(products));
app.get("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  product ? res.json(product) : res.status(404).json({ message: "Produk tidak ditemukan" });
});
app.post("/api/products", (req, res) => {
  const { name, category, price, image, description } = req.body;
  const newProduct = { id: Date.now(), name, category, price, image, description: description || "" };
  products.push(newProduct);
  res.status(201).json({ message: "Produk ditambahkan", product: newProduct });
});
app.put("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).json({ message: "Produk tidak ditemukan" });
  Object.assign(product, req.body);
  res.json({ message: "Produk diperbarui", product });
});
app.delete("/api/products/:id", (req, res) => {
  const index = products.findIndex(p => p.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Produk tidak ditemukan" });
  const deleted = products.splice(index, 1);
  res.json({ message: "Produk dihapus", deleted });
});

// ======== Cart =========
app.get("/api/cart", (req, res) => res.json(cart));
app.post("/api/cart", (req, res) => {
  const { productId, qty } = req.body;
  const id = Date.now();
  const newItem = { id, productId, qty: qty || 1 };
  cart.push(newItem);
  res.status(201).json(newItem);
});
app.patch("/api/cart/:id", (req, res) => {
  const item = cart.find(i => i.id == req.params.id);
  if (!item) return res.status(404).json({ message: "Item tidak ditemukan" });
  item.qty = req.body.qty;
  res.json(item);
});
app.delete("/api/cart/:id", (req, res) => {
  const index = cart.findIndex(i => i.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Item tidak ditemukan" });
  const deleted = cart.splice(index, 1);
  res.json({ message: "Item dihapus", deleted });
});
app.delete("/api/cart", (req, res) => {
  cart = [];
  res.json({ message: "Keranjang dikosongkan" });
});

// ======== Addresses =========
app.get("/api/addresses", (req, res) => res.json(addresses));
app.post("/api/addresses", (req, res) => {
  const { name, address, phone } = req.body;
  const newAddress = { id: Date.now(), name, address, phone };
  addresses.push(newAddress);
  res.status(201).json(newAddress);
});
app.put("/api/addresses/:id", (req, res) => {
  const addr = addresses.find(a => a.id == req.params.id);
  if (!addr) return res.status(404).json({ message: "Alamat tidak ditemukan" });
  Object.assign(addr, req.body);
  res.json(addr);
});
app.delete("/api/addresses/:id", (req, res) => {
  const index = addresses.findIndex(a => a.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Alamat tidak ditemukan" });
  const deleted = addresses.splice(index, 1);
  res.json({ message: "Alamat dihapus", deleted });
});

// ======== Orders =========
app.get("/api/orders", (req, res) => res.json(orders));
app.post("/api/orders", (req, res) => {
  const { name, items, total, address, payment, date } = req.body;
  if (!name || !items?.length || !total || !address || !payment) {
    return res.status(400).json({ message: "Data pesanan tidak lengkap" });
  }
  const newOrder = {
    id: Date.now(), name, items, total, address, payment,
    date: date || new Date().toISOString(),
    status: "Belum Dibayar", courier: "", trackingNumber: ""
  };
  orders.push(newOrder);
  res.status(201).json({ message: "Pesanan berhasil dibuat", order: newOrder });
});
app.put("/api/orders/:id", (req, res) => {
  const order = orders.find(o => o.id == req.params.id);
  if (!order) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  Object.assign(order, req.body);
  res.json({ message: "Pesanan diupdate", order });
});
app.delete("/api/orders/:id", (req, res) => {
  const index = orders.findIndex(o => o.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  const deleted = orders.splice(index, 1);
  res.json({ message: "Pesanan dihapus", deleted });
});

// ======== Users =========
app.post("/api/signup", (req, res) => {
  const { name, email, password, image } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Lengkapi semua field!" });
  if (users.some(u => u.email === email))
    return res.status(409).json({ message: "Email sudah digunakan" });
  const newUser = { id: Date.now(), name, email, password, image: image || null };
  users.push(newUser);
  res.status(201).json({ message: "Pendaftaran berhasil", user: newUser });
});
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: "Email atau password salah" });
  res.json({ message: "Login berhasil", user: { id: user.id, name: user.name, email: user.email, image: user.image || null } });
});
app.put("/api/update-user/:email", (req, res) => {
  const { email } = req.params;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
  Object.assign(user, req.body);
  res.json({ message: "User berhasil diupdate", user });
});
app.delete("/api/delete-user/:email", (req, res) => {
  const { email } = req.params;
  const index = users.findIndex(u => u.email === email);
  if (index === -1) return res.status(404).json({ message: "User tidak ditemukan" });
  const deletedUser = users.splice(index, 1);
  res.json({ message: "User berhasil dihapus", deletedUser });
});
app.get("/api/users", (req, res) => res.json(users));

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

// ======== Checkout Draft & Confirm =========
app.post("/api/checkout/draft", (req, res) => {
  const draft = {
    id: Date.now().toString(),
    ...req.body,
    paymentStatus: "Belum Dibayar",
    createdAt: new Date().toISOString(),
  };
  draftOrders.push(draft);
  res.status(200).json(draft);
});
app.get("/api/checkout/draft/:id", (req, res) => {
  const draft = draftOrders.find((d) => d.id === req.params.id);
  if (!draft) return res.status(404).json({ message: "Draft tidak ditemukan" });
  res.json(draft);
});
app.get("/api/checkout/drafts", (req, res) => res.json(draftOrders));
app.post("/api/checkout/confirm/:id", (req, res) => {
  const draftIndex = draftOrders.findIndex((d) => d.id === req.params.id);
  if (draftIndex === -1) return res.status(404).json({ message: "Draft tidak ditemukan" });
  const confirmedOrder = {
    ...draftOrders[draftIndex],
    paymentProof: req.body.paymentProof || "",
    paymentStatus: "Sudah Dibayar",
  };
  orders.push(confirmedOrder);
  draftOrders.splice(draftIndex, 1);
  res.status(201).json({ message: "Order berhasil dikonfirmasi", order: confirmedOrder });
});

// ======== Start Server =========
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});