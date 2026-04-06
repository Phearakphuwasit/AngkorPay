require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const connectDB = require("./config/db");

const app = express();

// ==============================
// 🔥 CONNECT DATABASE
// ==============================
(async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  }
})();

// ==============================
// 🔐 MIDDLEWARE
// ==============================

// 🌍 CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// 🧾 Logging (dev-friendly)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// 🍪 Cookies + JSON
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ==============================
// 🧪 HEALTH CHECK
// ==============================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "API is running 🚀",
  });
});

// ==============================
// 📦 ROUTES (CLEAN IMPORT)
// ==============================
const routes = [
  { path: "/api/auth", file: "./routes/auth" },
  { path: "/api/dashboard", file: "./routes/dashboard" },
  { path: "/api/loans", file: "./routes/loans" },
  { path: "/api/collections", file: "./routes/collections" },
  { path: "/api/customers", file: "./routes/customers" },
  { path: "/api/transactions", file: "./routes/transactions" },
  { path: "/api/audit", file: "./routes/audit" },
];

routes.forEach((route) => {
  try {
    const router = require(route.file);
    app.use(route.path, router);
    console.log(`✅ Loaded: ${route.path}`);
  } catch (err) {
    console.error(`❌ Failed: ${route.path} →`, err.message);
  }
});

// ==============================
// ❌ 404 HANDLER
// ==============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ==============================
// 🚨 GLOBAL ERROR HANDLER
// ==============================
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ==============================
// 🚀 START SERVER
// ==============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});