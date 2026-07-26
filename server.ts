import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_INVOICES, 
  INITIAL_REPAIRS, 
  INITIAL_WARRANTIES 
} from "./src/mockData";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "DATASOFT");

// Helper to ensure database files exist and return paths
function ensureDbFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const collections = {
    products: INITIAL_PRODUCTS,
    customers: INITIAL_CUSTOMERS,
    invoices: INITIAL_INVOICES,
    repairs: INITIAL_REPAIRS,
    warranties: INITIAL_WARRANTIES,
    categories: [
      { id: "cat1", name: "Điện thoại" },
      { id: "cat2", name: "Máy tính bảng" },
      { id: "cat3", name: "Laptop" },
      { id: "cat4", name: "Đồng hồ" },
      { id: "cat5", name: "Phụ kiện" },
      { id: "catc1", name: "Mainboard" },
      { id: "catc2", name: "RAM" },
      { id: "catc3", name: "Ổ cứng" },
      { id: "catc4", name: "Nguồn" }
    ],
    imeis: [],
    debts: [],
    suppliers: [],
    activities: [],
    users: [
      { id: "usr_admin", username: "admin", password: "123", fullName: "Nguyễn Văn Admin", role: "admin", phone: "0901234567", createdAt: new Date().toISOString() },
      { id: "usr_sales", username: "sales", password: "123", fullName: "Lê Thị Bán Hàng", role: "sales", phone: "0912233445", createdAt: new Date().toISOString() },
      { id: "usr_tech", username: "tech", password: "123", fullName: "Trần Văn Kỹ Thuật", role: "technician", phone: "0988776655", createdAt: new Date().toISOString() }
    ],
    settings: [
      {
        storeName: "THỊNH PHÁT COMPUTER",
        storeSlogan: "HỆ THỐNG MÁY TÍNH & THIẾT BỊ VĂN PHÒNG CHUYÊN NGHIỆP",
        storeAddress: "Ngõ 123 Cầu Giấy, Hà Nội",
        storePhone: "0914.888.999",
        storeWebsite: "www.thinhphatcomputer.vn",
        storeNote: "Cảm ơn quý khách đã tin tưởng và mua sắm! Sản phẩm thuộc hệ thống máy tính Thịnh Phát được bảo hành điện tử chính hãng.",
        primaryColor: "#4f46e5",
        fontSize: "md",
        showLogoSymbol: true,
        paperSize: "a4",
        bankId: "MB",
        bankAccountNo: "1234567890",
        bankAccountName: "NGUYEN VAN THINH",
        qrCompact: true
      }
    ]
  };

  for (const [key, initialData] of Object.entries(collections)) {
    const filePath = path.join(DATA_DIR, `${key}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), "utf8");
    }
  }
}

// Ensure at startup
ensureDbFiles();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // 1. API: Get all central database states (Booting)
  app.get("/api/db", (req, res) => {
    try {
      const keys = ["products", "customers", "invoices", "repairs", "warranties", "categories", "users", "settings", "imeis", "debts", "suppliers", "activities"];
      const responseBody: Record<string, any> = {};

      for (const k of keys) {
        const filePath = path.join(DATA_DIR, `${k}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          responseBody[k] = JSON.parse(content);
        } else {
          responseBody[k] = [];
        }
      }

      res.json({ success: true, db: responseBody });
    } catch (err: any) {
      console.error("Error reading database files:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. API: Unified State Saver
  app.post("/api/save", (req, res) => {
    try {
      const { type, data } = req.body;
      const validTypes = ["products", "customers", "invoices", "repairs", "warranties", "categories", "users", "settings", "imeis", "debts", "suppliers", "activities"];

      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, error: `Invalid collection type: ${type}` });
      }

      if (!Array.isArray(data)) {
        return res.status(400).json({ success: false, error: "Data payload must be an array" });
      }

      const filePath = path.join(DATA_DIR, `${type}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      
      res.json({ success: true });
    } catch (err: any) {
      console.error(`Error saving database ${req.body?.type}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: ["**/DATASOFT/**", "**/*.json"]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Webpack / Esbuild build static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`🚀 Server đang chạy thành công trên máy chủ Ubuntu/Linux`);
    console.log(`📍 Địa chỉ truy cập: http://0.0.0.0:${PORT}`);
    console.log(`📂 Thư mục lưu trữ dữ liệu JSON: ${DATA_DIR}`);
    console.log(`=======================================================`);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received, closing server...");
    server.close(() => console.log("Server closed."));
  });
  process.on("SIGINT", () => {
    console.log("SIGINT received, closing server...");
    server.close(() => console.log("Server closed."));
  });
}

startServer();
