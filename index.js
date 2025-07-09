const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3001;

// 🚀 FIX: Tambahkan limit lebih besar agar bisa handle base64 image besar
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" })); // <= ini wajib ditambah
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

app.use("/images", express.static("public/images"));


// Data produk disimpan di memori
let products = [
  {
    id: 1,
    name: "Intel Core i5 12400F",
    category: "Processor",
    price: 2800000,
    image: "/images/processor.png",
  },
  {
    id: 2,
    name: "Corsair Vengeance 16GB",
    category: "RAM",
    price: 950000,
    image: "/images/ram.png",
  },
  {
    id: 3,
    name: "MSI B660M Mortar",
    category: "Motherboard",
    price: 1850000,
    image: "/images/motherboard.png",
  },
  {
    id: 4,
    name: "SSD 256 GB",
    category: "Storage",
    price: 800000,
    image: "/images/ssd.png",
  },
];

// Data keranjang disimpan di memori
let cart = [];

// ✅ GET semua produk
app.get("/api/products", (req, res) => {
  res.json(products);
});

// ✅ GET isi keranjang
app.get("/api/cart", (req, res) => {
  res.json(cart);
});

// ✅ POST - Tambah item ke keranjang
app.post("/api/cart", (req, res) => {
  const { productId, qty } = req.body;
  const id = Date.now(); // ID unik
  const newItem = { id, productId, qty: qty || 1 };
  cart.push(newItem);
  res.status(201).json(newItem);
});

// ✅ PATCH - Update jumlah qty item di keranjang
app.patch("/api/cart/:id", (req, res) => {
  const { id } = req.params;
  const { qty } = req.body;
  const item = cart.find((item) => item.id == id);
  if (!item) return res.status(404).json({ message: "Item tidak ditemukan" });
  item.qty = qty;
  res.json(item);
});

// ✅ DELETE satu item dari keranjang
app.delete("/api/cart/:id", (req, res) => {
  const { id } = req.params;
  const index = cart.findIndex((item) => item.id == id);
  if (index === -1) {
    return res.status(404).json({ message: "Item tidak ditemukan" });
  }
  const deleted = cart.splice(index, 1);
  res.json({ message: "Item berhasil dihapus", deleted });
});

// ✅ DELETE semua isi keranjang
app.delete("/api/cart", (req, res) => {
  cart = [];
  res.json({ message: "Cart dikosongkan" });
});

// ✅ Hapus satu item di keranjang
app.delete("/api/cart/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = cart.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Item tidak ditemukan" });
  }
  cart.splice(index, 1);
  res.json({ message: "Item dihapus dari keranjang" });
});

app.get("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const product = products.find((p) => p.id === parseInt(id));

  if (!product) {
    return res.status(404).json({ message: "Produk tidak ditemukan" });
  }

  res.json(product);
});




// Simpan alamat di memori
let addresses = [];

// ✅ GET semua alamat
app.get("/api/addresses", (req, res) => {
  res.json(addresses);
});

// ✅ POST alamat baru
app.post("/api/addresses", (req, res) => {
  const { name, address, phone } = req.body;
  const newAddress = {
    id: Date.now(), // ID unik
    name,
    address,
    phone,
  };
  addresses.push(newAddress);
  res.status(201).json(newAddress);
});

// ✅ PUT - Edit alamat berdasarkan ID
app.put("/api/addresses/:id", (req, res) => {
  const { id } = req.params;
  const { name, address, phone } = req.body;
  const addr = addresses.find((a) => a.id == id);
  if (!addr) return res.status(404).json({ message: "Alamat tidak ditemukan" });

  addr.name = name;
  addr.address = address;
  addr.phone = phone;
  res.json(addr);
});

// ✅ DELETE alamat berdasarkan ID
app.delete("/api/addresses/:id", (req, res) => {
  const { id } = req.params;
  const index = addresses.findIndex((a) => a.id == id);
  if (index === -1) {
    return res.status(404).json({ message: "Alamat tidak ditemukan" });
  }
  const deleted = addresses.splice(index, 1);
  res.json({ message: "Alamat berhasil dihapus", deleted });
});


// Simpan data order di memori
let orders = [];

// ✅ GET semua pesanan
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// ✅ POST buat pesanan baru
app.post("/api/orders", (req, res) => {
  const { name, items, total, address, payment, date } = req.body;

  if (!name || !items || !Array.isArray(items) || items.length === 0 || !total || !address || !payment) {
    return res.status(400).json({ message: "Data pesanan tidak lengkap" });
  }

  const newOrder = {
    id: Date.now(),
    name,
    items,
    total,
    address,
    payment,
    date: date || new Date().toISOString(),
  };

  orders.push(newOrder);
  res.status(201).json({ message: "Pesanan berhasil dibuat", order: newOrder });
});

// ✅ DELETE satu pesanan berdasarkan ID
app.delete("/api/orders/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Pesanan tidak ditemukan" });
  }
  const deleted = orders.splice(index, 1);
  res.json({ message: "Pesanan berhasil dihapus", deleted });
});


let users = [];

// ✅ POST - Sign up user baru
app.post("/api/signup", (req, res) => {
  const { name, email, password, image } = req.body;

  // Validasi field
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Lengkapi semua field!" });
  }

  // Cek apakah email sudah dipakai
  const userExists = users.some((user) => user.email === email);
  if (userExists) {
    return res.status(409).json({ message: "Email sudah digunakan" });
  }

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    image: image || null,
  };

  users.push(newUser);
  res.status(201).json({ message: "Pendaftaran berhasil", user: newUser });
});


// ✅ POST - Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Validasi input
  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password wajib diisi" });
  }

  // Cari user
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "Email atau password salah" });
  }

  res.json({
    message: "Login berhasil",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image || null,
    },
  });
});

app.put("/api/update-user/:email", (req, res) => {
  const { email } = req.params;
  const { name, password, image } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  user.name = name || user.name;
  user.password = password || user.password;
  user.image = image || user.image;

  res.json({ message: "User berhasil diupdate", user });
});




// ✅ Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


