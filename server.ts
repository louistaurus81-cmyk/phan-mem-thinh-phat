import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_INVOICES, 
  INITIAL_REPAIRS, 
  INITIAL_WARRANTIES 
} from "./src/mockData";
import { getUserPermissions } from "./src/types";
import { 
  readJSON, 
  writeJSONSafe, 
  createBackup, 
  readJSONSync, 
  writeJSONSafeSync 
} from "./jsonStorageHelper";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "DATASOFT");
const JWT_SECRET = process.env.JWT_SECRET || "thinhphat_computer_super_secure_jwt_secret_2026_@#!";

export interface AuthTokenPayload {
  id: string;
  username: string;
  role: "admin" | "sales" | "technician";
  fullName: string;
  permissions?: Record<string, boolean>;
}

// -------------------------------------------------------------
// 1. Password Hashing & Encryption Helpers
// -------------------------------------------------------------
export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

export function verifyPassword(plainText: string, hashedOrPlain: string): boolean {
  if (!hashedOrPlain) return false;
  // If stored password matches bcrypt pattern ($2a$, $2b$, or $2y$)
  if (/^\$2[aby]\$\d{2}\$/.test(hashedOrPlain)) {
    return bcrypt.compareSync(plainText, hashedOrPlain);
  }
  // Legacy plain-text fallback
  return plainText === hashedOrPlain;
}

// Helper to ensure database files exist and passwords are encrypted
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
    import_orders: [],
    activities: [],
    users: [
      { 
        id: "usr_admin", 
        username: "admin", 
        password: hashPassword("123"), 
        fullName: "Nguyễn Văn Admin", 
        role: "admin", 
        phone: "0901234567", 
        createdAt: new Date().toISOString() 
      },
      { 
        id: "usr_sales", 
        username: "sales", 
        password: hashPassword("123"), 
        fullName: "Lê Thị Bán Hàng", 
        role: "sales", 
        phone: "0912233445", 
        createdAt: new Date().toISOString() 
      },
      { 
        id: "usr_tech", 
        username: "tech", 
        password: hashPassword("123"), 
        fullName: "Trần Văn Kỹ Thuật", 
        role: "technician", 
        phone: "0988776655", 
        createdAt: new Date().toISOString() 
      }
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
      writeJSONSafeSync(filePath, initialData, { backup: false });
    }
  }

  // Auto-migrate any existing unhashed passwords in users.json to Bcrypt
  const usersPath = path.join(DATA_DIR, "users.json");
  if (fs.existsSync(usersPath)) {
    try {
      const users = readJSONSync<any[]>(usersPath, []);
      let migrated = false;
      for (const u of users) {
        if (u.password && !/^\$2[aby]\$\d{2}\$/.test(u.password)) {
          u.password = hashPassword(u.password);
          migrated = true;
        }
      }
      if (migrated) {
        writeJSONSafeSync(usersPath, users, { backup: true });
        console.log("🔒 [Security] Đã tự động băm mật khẩu tài khoản bằng Bcrypt trong users.json!");
      }
    } catch (e) {
      console.error("Lỗi khi kiểm tra mã hóa mật khẩu users:", e);
    }
  }
}

// Ensure at startup
ensureDbFiles();

// -------------------------------------------------------------
// 2. Authentication & RBAC Middleware
// -------------------------------------------------------------

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"] || (req.headers["x-auth-token"] as string);
  let token: string | undefined;

  if (authHeader) {
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (typeof authHeader === "string") {
      token = authHeader.trim();
    }
  } else if (typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: "Yêu cầu xác thực: Vui lòng đăng nhập với Token hợp lệ để thực hiện thao tác." 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ 
      success: false, 
      error: "Phiên đăng nhập đã hết hạn hoặc Token không hợp lệ. Vui lòng đăng nhập lại!",
      expired: true 
    });
  }
}

export function extractUserIfPresent(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"] || (req.headers["x-auth-token"] as string);
  let token: string | undefined;

  if (authHeader) {
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (typeof authHeader === "string") {
      token = authHeader.trim();
    }
  } else if (typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      (req as any).user = decoded;
    } catch {
      (req as any).user = null;
    }
  } else {
    (req as any).user = null;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthTokenPayload | undefined;
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Từ chối truy cập (403 Forbidden): Thao tác nhạy cảm này bắt buộc quyền Quản trị viên (Admin)!"
    });
  }
  next();
}

// -------------------------------------------------------------
// 3. Server-side Sensitive Data Scrubbing Helpers
// -------------------------------------------------------------

function sanitizeUsers(users: any[]): any[] {
  return users.map(u => {
    const { password, ...safeUser } = u;
    return safeUser;
  });
}

function sanitizeProductsForRole(products: any[], role?: string): any[] {
  // Always preserve product cost so that stock management, import pricing, and inventory valuation operate properly
  return products;
}

// -------------------------------------------------------------
// 4. Server Initialization & Routes
// -------------------------------------------------------------

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // API 1: Auth Login with Bcrypt verification & JWT issuance
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!" 
        });
      }

      const usersPath = path.join(DATA_DIR, "users.json");
      const users = await readJSON<any[]>(usersPath, []);
      if (!users || users.length === 0) {
        return res.status(500).json({ success: false, error: "Dữ liệu người dùng chưa được khởi tạo" });
      }

      const trimmedUser = username.trim().toLowerCase();
      const matchedUser = users.find((u: any) => u.username.toLowerCase() === trimmedUser);

      if (!matchedUser) {
        return res.status(401).json({ success: false, error: "Tài khoản không tồn tại trên hệ thống!" });
      }

      const isPasswordValid = verifyPassword(password, matchedUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: "Mật khẩu của tài khoản chưa chính xác!" });
      }

      // Upgrade plain password to bcrypt if needed using Atomic Write & Auto-Backup
      if (!/^\$2[aby]\$\d{2}\$/.test(matchedUser.password)) {
        matchedUser.password = hashPassword(password);
        await writeJSONSafe(usersPath, users, { backup: true });
      }

      const tokenPayload: AuthTokenPayload = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        fullName: matchedUser.fullName,
        permissions: matchedUser.permissions
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });
      const { password: _, ...safeUser } = matchedUser;

      res.json({
        success: true,
        token,
        user: safeUser,
        message: "Đăng nhập thành công"
      });
    } catch (err: any) {
      console.error("Login API Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 2: Current authenticated profile verification
  app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({ success: true, user: (req as any).user });
  });

  // API 3: Get Central Database State with Server-Side Role-Based Sensitive Data Filtering
  app.get("/api/db", extractUserIfPresent, async (req, res) => {
    try {
      const user = (req as any).user as AuthTokenPayload | null;
      const userRole = user ? user.role : undefined;

      const keys = ["products", "customers", "invoices", "repairs", "warranties", "categories", "users", "settings", "imeis", "debts", "suppliers", "import_orders", "activities"];
      const responseBody: Record<string, any> = {};

      const results = await Promise.all(
        keys.map(async k => {
          const filePath = path.join(DATA_DIR, `${k}.json`);
          const data = await readJSON(filePath, []);
          return { key: k, data };
        })
      );

      results.forEach(item => {
        responseBody[item.key] = item.data;
      });

      // 🛡️ SERVER-SIDE SENSITIVE FILTERING:
      // If role is sales or technician (or unauthenticated guest), strictly scrub 'cost' from products
      if (responseBody["products"]) {
        responseBody["products"] = sanitizeProductsForRole(responseBody["products"], userRole);
      }

      // Always scrub passwords from users array so hashes are never leaked over the wire
      if (responseBody["users"]) {
        responseBody["users"] = sanitizeUsers(responseBody["users"]);
      }

      res.json({ 
        success: true, 
        db: responseBody,
        authenticatedRole: userRole || "guest"
      });
    } catch (err: any) {
      console.error("Error reading database files:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 4: Dangerous Operation: Direct Stock Adjustment (Admin Only)
  app.post("/api/inventory/adjust-stock", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { productId, newStock, reason } = req.body;
      if (!productId || typeof newStock !== "number") {
        return res.status(400).json({ success: false, error: "Cần cung cấp productId và số lượng tồn mới newStock (số nguyên)" });
      }

      const filePath = path.join(DATA_DIR, "products.json");
      const products = await readJSON<any[]>(filePath, []);
      const pIdx = products.findIndex(p => p.id === productId || p.sku === productId);

      if (pIdx === -1) {
        return res.status(404).json({ success: false, error: "Không tìm thấy sản phẩm cần điều chỉnh tồn kho" });
      }

      const oldStock = products[pIdx].stock;
      products[pIdx].stock = newStock;
      await writeJSONSafe(filePath, products, { backup: true });

      // Record audit activity
      const actPath = path.join(DATA_DIR, "activities.json");
      let activities = await readJSON<any[]>(actPath, []);
      activities.unshift({
        id: `act_${Date.now()}`,
        module: 'inventory',
        action: 'Điều chỉnh tồn kho trực tiếp',
        description: `Admin điều chỉnh tồn kho: ${products[pIdx].name} (${oldStock} -> ${newStock}). Lý do: ${reason || 'Kiểm kê định kỳ'}`,
        staffName: (req as any).user.fullName,
        timestamp: new Date().toISOString(),
        severity: 'warning'
      });
      await writeJSONSafe(actPath, activities.slice(0, 100), { backup: false });

      res.json({ success: true, message: "Điều chỉnh tồn kho thành công", product: products[pIdx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 5: Dangerous Operation: Delete Invoice (Admin Only)
  app.delete("/api/invoices/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const filePath = path.join(DATA_DIR, "invoices.json");
      const invoices = await readJSON<any[]>(filePath, []);

      const filtered = invoices.filter(inv => inv.id !== invoiceId && inv.invoiceNumber !== invoiceId);
      if (filtered.length === invoices.length) {
        return res.status(404).json({ success: false, error: "Không tìm thấy hóa đơn cần xóa" });
      }

      // Tạo bản sao lưu an toàn trước thao tác xóa
      await createBackup(filePath);
      await writeJSONSafe(filePath, filtered, { backup: true });
      res.json({ success: true, message: "Hóa đơn đã được xóa vĩnh viễn bởi Quản trị viên" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 6: Dangerous Operation: Edit Existing Invoice (Admin Only)
  app.put("/api/invoices/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const updatedData = req.body;
      const filePath = path.join(DATA_DIR, "invoices.json");
      const invoices = await readJSON<any[]>(filePath, []);

      const idx = invoices.findIndex(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: "Không tìm thấy hóa đơn cần chỉnh sửa" });
      }

      // Tạo bản sao lưu an toàn trước thao tác chỉnh sửa hóa đơn
      await createBackup(filePath);
      invoices[idx] = { 
        ...invoices[idx], 
        ...updatedData, 
        updatedAt: new Date().toISOString() 
      };
      await writeJSONSafe(filePath, invoices, { backup: true });
      res.json({ success: true, message: "Cập nhật hóa đơn thành công bởi Quản trị viên", invoice: invoices[idx] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 7: Dangerous Operation: View Financial Reports & Total Margins (Admin Only)
  app.get("/api/reports/financial", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const invoicesPath = path.join(DATA_DIR, "invoices.json");
      const productsPath = path.join(DATA_DIR, "products.json");
      const invoices = await readJSON<any[]>(invoicesPath, []);
      const products = await readJSON<any[]>(productsPath, []);

      const productCostMap = new Map<string, number>();
      products.forEach((p: any) => {
        if (p.id) productCostMap.set(p.id, p.cost || 0);
        if (p.sku) productCostMap.set(p.sku, p.cost || 0);
      });

      let totalRevenue = 0;
      let totalCost = 0;

      invoices.forEach((inv: any) => {
        totalRevenue += inv.totalAmount || 0;
        (inv.items || []).forEach((it: any) => {
          const itemCost = productCostMap.get(it.productId) || (it.price * 0.75);
          totalCost += itemCost * (it.quantity || 1);
        });
      });

      const grossProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      res.json({
        success: true,
        financialReport: {
          totalRevenue,
          totalCost,
          grossProfit,
          profitMargin: Math.round(profitMargin * 10) / 10,
          totalInvoices: invoices.length,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 8: Unified State Saver with RBAC & Atomic Write Protection
  app.post("/api/save", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user as AuthTokenPayload;
      const { type, data } = req.body;
      const validTypes = ["products", "customers", "invoices", "repairs", "warranties", "categories", "users", "settings", "imeis", "debts", "suppliers", "import_orders", "activities"];

      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, error: `Invalid collection type: ${type}` });
      }

      if (!Array.isArray(data)) {
        return res.status(400).json({ success: false, error: "Data payload must be an array" });
      }

      // 🛡️ RBAC Check 1: Managing accounts and credentials (users.json) -> ONLY ADMIN
      if (type === "users") {
        if (user.role !== "admin") {
          return res.status(403).json({ 
            success: false, 
            error: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền quản lý tài khoản và phân quyền nhân viên!" 
          });
        }

        const usersPath = path.join(DATA_DIR, "users.json");
        const existingUsers = await readJSON<any[]>(usersPath, []);
        const existingMap = new Map<string, any>(existingUsers.map(u => [u.id, u]));

        // Hash new passwords with bcrypt, or preserve existing password hashes if untouched
        const processedUsers = data.map((u: any) => {
          const existing = existingMap.get(u.id);
          let finalPassword = existing?.password;

          if (u.password && typeof u.password === "string" && u.password.trim().length > 0) {
            if (/^\$2[aby]\$\d{2}\$/.test(u.password)) {
              finalPassword = u.password;
            } else {
              finalPassword = hashPassword(u.password);
            }
          }

          return {
            ...u,
            password: finalPassword || hashPassword("123")
          };
        });

        await writeJSONSafe(usersPath, processedUsers, { backup: true });
        return res.json({ success: true, message: "Đã lưu tài khoản nhân viên an toàn với mã hóa Bcrypt" });
      }

      // 🛡️ RBAC Check 2: Deleting or modifying existing invoices -> ONLY ADMIN
      if (type === "invoices") {
        const invPath = path.join(DATA_DIR, "invoices.json");
        const existingInvoices = await readJSON<any[]>(invPath, []);

        if (user.role !== "admin") {
          const incomingIds = new Set(data.map((inv: any) => inv.id));
          const wasDeleted = existingInvoices.some(inv => !incomingIds.has(inv.id));
          if (wasDeleted) {
            return res.status(403).json({
              success: false,
              error: "Từ chối truy cập: Thao tác XÓA hóa đơn đã lập bắt buộc quyền Quản trị viên (Admin)!"
            });
          }

          const existingMap = new Map(existingInvoices.map(inv => [inv.id, inv]));
          for (const inv of data) {
            const prev = existingMap.get(inv.id);
            if (prev && JSON.stringify(prev) !== JSON.stringify(inv)) {
              return res.status(403).json({
                success: false,
                error: "Từ chối truy cập: Thao tác CHỈNH SỬA hóa đơn đã lập bắt buộc quyền Quản trị viên (Admin)!"
              });
            }
          }
        }
      }

      // 🛡️ RBAC Check 3: Products management & Preserving Cost
      if (type === "products") {
        const prodPath = path.join(DATA_DIR, "products.json");
        const existingProducts = await readJSON<any[]>(prodPath, []);
        const existingMap = new Map(existingProducts.map(p => [p.id, p]));

        if (user.role !== "admin") {
          // Non-admins cannot delete products
          const incomingIds = new Set(data.map((p: any) => p.id));
          const wasDeleted = existingProducts.some(p => !incomingIds.has(p.id));
          if (wasDeleted) {
            return res.status(403).json({
              success: false,
              error: "Từ chối truy cập: Thao tác XÓA sản phẩm bắt buộc quyền Quản trị viên (Admin)!"
            });
          }

          // Restore 'cost' from database so sales/technician updates (stock deduction) do not wipe out stored cost!
          const restoredProducts = data.map((p: any) => {
            const existing = existingMap.get(p.id);
            return {
              ...p,
              cost: typeof p.cost === "number" && p.cost > 0 ? p.cost : (existing?.cost ?? 0)
            };
          });

          await writeJSONSafe(prodPath, restoredProducts, { backup: true });
          return res.json({ success: true });
        }
      }

      // 🛡️ RBAC Check 4: Store system and print settings -> ONLY ADMIN
      if (type === "settings" && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền thay đổi cấu hình cửa hàng!"
        });
      }

      // Ghi dữ liệu an toàn với Atomic Write, Hàng đợi Mutex và Tự động sao lưu (.bak)
      const filePath = path.join(DATA_DIR, `${type}.json`);
      await writeJSONSafe(filePath, data, { backup: true });
      
      res.json({ success: true });
    } catch (err: any) {
      console.error(`Error saving database ${req.body?.type}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Cập nhật quyền hạn nhân viên (User Permissions Update)
  app.put("/api/users/:id/permissions", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { permissions, role, fullName, phone, password } = req.body;

      const usersPath = path.join(DATA_DIR, "users.json");
      const users = await readJSON<any[]>(usersPath, []);
      const userIdx = users.findIndex(u => u.id === userId);

      if (userIdx === -1) {
        return res.status(404).json({ success: false, error: "Không tìm thấy tài khoản nhân viên" });
      }

      if (role) users[userIdx].role = role;
      if (fullName) users[userIdx].fullName = fullName;
      if (phone !== undefined) users[userIdx].phone = phone;

      if (password && typeof password === "string" && password.trim().length > 0) {
        users[userIdx].password = hashPassword(password);
      }

      if (permissions) {
        if (Array.isArray(permissions)) {
          const permObj: any = {};
          permissions.forEach((pKey: string) => {
            permObj[pKey] = true;
          });
          users[userIdx].permissions = permObj;
        } else {
          users[userIdx].permissions = permissions;
        }
      }

      await writeJSONSafe(usersPath, users, { backup: true });
      res.json({
        success: true,
        message: `Đã cập nhật quyền hạn cho nhân viên ${users[userIdx].fullName} thành công!`,
        user: sanitizeUsers([users[userIdx]])[0]
      });
    } catch (err: any) {
      console.error("Lỗi khi cập nhật quyền hạn user:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Xóa Hóa Đơn Bán Hàng & Hoàn Trả Tồn Kho (Delete Invoice with Stock Restoration)
  app.delete("/api/invoices/:id", authenticateToken, async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const user = (req as any).user;

      if (user?.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Từ chối truy cập: Thao tác XÓA hóa đơn bắt buộc quyền Quản trị viên (Admin)!"
        });
      }

      const invPath = path.join(DATA_DIR, "invoices.json");
      const prodsPath = path.join(DATA_DIR, "products.json");
      const imeisPath = path.join(DATA_DIR, "imeis.json");
      const debtsPath = path.join(DATA_DIR, "debts.json");
      const actPath = path.join(DATA_DIR, "activities.json");

      const invoices = await readJSON<any[]>(invPath, []);
      const products = await readJSON<any[]>(prodsPath, []);
      const imeis = await readJSON<any[]>(imeisPath, []);
      const debts = await readJSON<any[]>(debtsPath, []);
      const activities = await readJSON<any[]>(actPath, []);

      const invIdx = invoices.findIndex(i => i.id === invoiceId);
      if (invIdx === -1) {
        return res.status(404).json({ success: false, error: "Không tìm thấy hóa đơn cần xóa" });
      }

      const targetInv = invoices[invIdx];

      // 1. Hoàn lại tồn kho sản phẩm & khôi phục trạng thái IMEI
      for (const item of (targetInv.items || [])) {
        const pIdx = products.findIndex(p => p.id === item.productId || p.sku === item.productId);
        if (pIdx !== -1) {
          products[pIdx].stock = (products[pIdx].stock || 0) + Number(item.quantity || 1);
        }

        if (item.imeis && Array.isArray(item.imeis)) {
          for (const im of item.imeis) {
            const imeiIdx = imeis.findIndex(i => i.imei === im || i.id === im);
            if (imeiIdx !== -1) {
              imeis[imeiIdx].status = 'in_stock';
              imeis[imeiIdx].in_stock = true;
              delete imeis[imeiIdx].invoiceId;
              delete imeis[imeiIdx].soldAt;
            }
          }
        }
      }

      // 2. Xóa bản ghi công nợ tương ứng nếu có
      const updatedDebts = debts.filter(d => d.invoiceId !== targetInv.id && d.invoiceNumber !== targetInv.invoiceNumber);

      // 3. Xóa hóa đơn
      const updatedInvoices = invoices.filter(i => i.id !== invoiceId);

      // 4. Ghi nhật ký
      activities.unshift({
        id: `act_${Date.now()}`,
        type: 'sale',
        title: 'Xóa hóa đơn bán hàng',
        details: `Đã xóa hóa đơn ${targetInv.invoiceNumber} (${targetInv.customerName}) và hoàn trả tồn kho sản phẩm.`,
        userName: user?.fullName || 'Admin',
        userRole: user?.role || 'admin',
        userId: user?.id || 'admin',
        timestamp: new Date().toISOString(),
        severity: 'danger'
      });

      await writeJSONSafe(invPath, updatedInvoices, { backup: true });
      await writeJSONSafe(prodsPath, products, { backup: true });
      await writeJSONSafe(imeisPath, imeis, { backup: true });
      await writeJSONSafe(debtsPath, updatedDebts, { backup: true });
      await writeJSONSafe(actPath, activities.slice(0, 100), { backup: false });

      res.json({
        success: true,
        message: `Đã xóa hóa đơn ${targetInv.invoiceNumber} và hoàn trả sản phẩm vào tồn kho thành công!`,
        updatedInvoices
      });
    } catch (err: any) {
      console.error("Lỗi khi xóa hóa đơn:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Chỉnh Sửa Hóa Đơn Bán Hàng (Update Invoice Details)
  app.put("/api/invoices/:id", authenticateToken, async (req, res) => {
    try {
      const invoiceId = req.params.id;
      const user = (req as any).user;

      const usersPath = path.join(DATA_DIR, "users.json");
      const users = await readJSON<any[]>(usersPath, []);
      const currentUserDb = users.find(u => u.id === user?.id);
      const perms = getUserPermissions(currentUserDb || user);

      if (user?.role !== "admin" && !perms.canEditInvoices) {
        return res.status(403).json({
          success: false,
          error: "Từ chối truy cập: Bạn không có quyền chỉnh sửa hóa đơn đã lập!"
        });
      }

      const invPath = path.join(DATA_DIR, "invoices.json");
      const invoices = await readJSON<any[]>(invPath, []);
      const invIdx = invoices.findIndex(i => i.id === invoiceId);

      if (invIdx === -1) {
        return res.status(404).json({ success: false, error: "Không tìm thấy hóa đơn cần cập nhật" });
      }

      const updatedData = req.body;
      invoices[invIdx] = {
        ...invoices[invIdx],
        ...updatedData,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.fullName || 'User'
      };

      await writeJSONSafe(invPath, invoices, { backup: true });
      res.json({
        success: true,
        message: `Cập nhật hóa đơn ${invoices[invIdx].invoiceNumber} thành công!`,
        invoice: invoices[invIdx]
      });
    } catch (err: any) {
      console.error("Lỗi khi sửa hóa đơn:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 8: Tạo Phiếu Nhập Hàng & Đồng Bộ Kho (Purchase Order)
  app.post("/api/import-orders", extractUserIfPresent, async (req, res) => {
    try {
      const { order } = req.body;
      if (!order || !order.supplierId || !Array.isArray(order.items) || order.items.length === 0) {
        return res.status(400).json({ success: false, error: "Thông tin phiếu nhập không hợp lệ hoặc thiếu danh sách sản phẩm" });
      }

      const prodsPath = path.join(DATA_DIR, "products.json");
      const suppPath = path.join(DATA_DIR, "suppliers.json");
      const imeisPath = path.join(DATA_DIR, "imeis.json");
      const ordersPath = path.join(DATA_DIR, "import_orders.json");
      const actPath = path.join(DATA_DIR, "activities.json");

      const products = await readJSON<any[]>(prodsPath, []);
      const suppliers = await readJSON<any[]>(suppPath, []);
      const imeis = await readJSON<any[]>(imeisPath, []);
      const importOrders = await readJSON<any[]>(ordersPath, []);
      const activities = await readJSON<any[]>(actPath, []);

      // 1. Cập nhật tồn kho và giá vốn (giá nhập) cho sản phẩm
      const newImeis: any[] = [];
      for (const item of order.items) {
        const pIdx = products.findIndex(p => p.id === item.productId || p.sku === item.productId);
        if (pIdx !== -1) {
          products[pIdx].stock = (products[pIdx].stock || 0) + Number(item.quantity || 0);
          // Cập nhật giá vốn cost mới nếu có giá nhập
          if (typeof item.importPrice === "number" && item.importPrice >= 0) {
            products[pIdx].cost = item.importPrice;
          }
          if (!products[pIdx].supplierId) {
            products[pIdx].supplierId = order.supplierId;
          }
        }

        // Bổ sung IMEI vào kho nếu sản phẩm quản lý IMEI
        if (item.hasImei && Array.isArray(item.imeis) && item.imeis.length > 0) {
          for (const im of item.imeis) {
            const cleanImei = String(im).trim();
            if (cleanImei) {
              newImeis.push({
                id: `imei_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                productId: item.productId,
                imei: cleanImei,
                status: 'in_stock',
                in_stock: true,
                importOrderId: order.id,
                addedAt: new Date().toISOString()
              });
            }
          }
        }
      }

      // 2. Cập nhật công nợ nhà cung cấp
      const supIdx = suppliers.findIndex(s => s.id === order.supplierId);
      if (supIdx !== -1 && order.debtAmount > 0) {
        suppliers[supIdx].currentDebt = (suppliers[supIdx].currentDebt || 0) + Number(order.debtAmount || 0);
      }

      // 3. Lưu phiếu nhập
      importOrders.unshift(order);

      // 4. Ghi nhận nhật ký hoạt động
      const user = (req as any).user;
      activities.unshift({
        id: `act_${Date.now()}`,
        module: 'supplier',
        action: 'Tạo phiếu nhập hàng',
        description: `Nhập hàng từ NCC: ${order.supplierName} - Mã phiếu: ${order.orderCode} - Tổng tiền: ${Number(order.totalAmount || 0).toLocaleString('vi-VN')} đ (Nợ: ${Number(order.debtAmount || 0).toLocaleString('vi-VN')} đ)`,
        staffName: user?.fullName || order.createdBy?.userName || 'Quản trị viên',
        timestamp: new Date().toISOString(),
        severity: 'info'
      });

      // Atomic write an toàn
      await writeJSONSafe(ordersPath, importOrders, { backup: true });
      await writeJSONSafe(prodsPath, products, { backup: true });
      if (newImeis.length > 0) {
        await writeJSONSafe(imeisPath, [...imeis, ...newImeis], { backup: true });
      }
      await writeJSONSafe(suppPath, suppliers, { backup: true });
      await writeJSONSafe(actPath, activities.slice(0, 100), { backup: false });

      res.json({
        success: true,
        message: "Tạo phiếu nhập hàng và đồng bộ dữ liệu kho thành công!",
        order,
        updatedProducts: products,
        updatedSuppliers: suppliers,
        newImeis
      });
    } catch (err: any) {
      console.error("Error creating import order:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 9: Hủy Phiếu Nhập Hàng với Kiểm Tra Ràng Buộc IMEI
  app.post("/api/import-orders/:id/cancel", extractUserIfPresent, async (req, res) => {
    try {
      const orderId = req.params.id;
      const { reason } = req.body;

      const prodsPath = path.join(DATA_DIR, "products.json");
      const suppPath = path.join(DATA_DIR, "suppliers.json");
      const imeisPath = path.join(DATA_DIR, "imeis.json");
      const ordersPath = path.join(DATA_DIR, "import_orders.json");
      const actPath = path.join(DATA_DIR, "activities.json");

      const products = await readJSON<any[]>(prodsPath, []);
      const suppliers = await readJSON<any[]>(suppPath, []);
      const imeis = await readJSON<any[]>(imeisPath, []);
      const importOrders = await readJSON<any[]>(ordersPath, []);
      const activities = await readJSON<any[]>(actPath, []);

      const orderIdx = importOrders.findIndex(o => o.id === orderId);
      if (orderIdx === -1) {
        return res.status(404).json({ success: false, error: "Không tìm thấy phiếu nhập hàng cần hủy" });
      }

      const order = importOrders[orderIdx];
      if (order.status === 'cancelled') {
        return res.status(400).json({ success: false, error: "Phiếu nhập hàng này đã bị hủy trước đó" });
      }

      // 🛡️ KIỂM TRA RÀNG BUỘC (Validation):
      // Không cho phép hủy phiếu nhập nếu bất kỳ IMEI nào trong phiếu đó đã xuất bán cho khách hàng hoặc đưa vào sửa chữa
      const orderImeis = imeis.filter(i => i.importOrderId === order.id);
      const soldImeis = orderImeis.filter(i => i.status === 'sold' || !i.in_stock || i.invoiceId || i.repairTicketId);

      if (soldImeis.length > 0) {
        const soldList = soldImeis.map(i => i.imei).join(', ');
        return res.status(400).json({
          success: false,
          error: `Không thể hủy phiếu nhập vì các IMEI sau đã được xuất bán cho khách hàng: ${soldList}. Vui lòng kiểm tra lại!`
        });
      }

      for (const item of order.items) {
        if (item.imeis && item.imeis.length > 0) {
          for (const im of item.imeis) {
            const matched = imeis.find(i => i.imei === im);
            if (matched && (matched.status === 'sold' || !matched.in_stock || matched.invoiceId || matched.repairTicketId)) {
              return res.status(400).json({
                success: false,
                error: `Không thể hủy phiếu nhập vì mã IMEI "${im}" đã được xuất bán cho khách hàng!`
              });
            }
          }
        }
      }

      // 1. Trừ lại số lượng tồn kho
      for (const item of order.items) {
        const pIdx = products.findIndex(p => p.id === item.productId || p.sku === item.productId);
        if (pIdx !== -1) {
          products[pIdx].stock = Math.max(0, (products[pIdx].stock || 0) - Number(item.quantity || 0));
        }
      }

      // 2. Xóa các IMEI thuộc phiếu nhập này (chưa bán)
      const orderImeiStrings = new Set<string>();
      orderImeis.forEach(i => orderImeiStrings.add(i.imei));
      order.items.forEach(it => (it.imeis || []).forEach(im => orderImeiStrings.add(im)));

      const remainingImeis = imeis.filter(i => i.importOrderId !== order.id && !orderImeiStrings.has(i.imei));

      // 3. Trừ lại công nợ NCC
      const supIdx = suppliers.findIndex(s => s.id === order.supplierId);
      if (supIdx !== -1 && order.debtAmount > 0) {
        suppliers[supIdx].currentDebt = Math.max(0, (suppliers[supIdx].currentDebt || 0) - Number(order.debtAmount || 0));
      }

      // 4. Cập nhật trạng thái phiếu
      order.status = 'cancelled';
      order.cancelledAt = new Date().toISOString();
      order.cancelReason = reason || 'Hủy phiếu nhập hàng';
      importOrders[orderIdx] = order;

      // 5. Ghi nhật ký
      const user = (req as any).user;
      activities.unshift({
        id: `act_${Date.now()}`,
        module: 'supplier',
        action: 'Hủy phiếu nhập hàng',
        description: `Đã hủy phiếu nhập: ${order.orderCode} (${order.supplierName}) - Đã hoàn nguyên tồn kho, xóa ${orderImeiStrings.size} IMEI và trừ nợ NCC: ${Number(order.debtAmount || 0).toLocaleString('vi-VN')} đ`,
        staffName: user?.fullName || 'Quản trị viên',
        timestamp: new Date().toISOString(),
        severity: 'warning'
      });

      // Atomic write an toàn
      await writeJSONSafe(ordersPath, importOrders, { backup: true });
      await writeJSONSafe(prodsPath, products, { backup: true });
      await writeJSONSafe(imeisPath, remainingImeis, { backup: true });
      await writeJSONSafe(suppPath, suppliers, { backup: true });
      await writeJSONSafe(actPath, activities.slice(0, 100), { backup: false });

      res.json({
        success: true,
        message: `Đã hủy thành công phiếu nhập ${order.orderCode}! Tồn kho, IMEI và công nợ đã được hoàn nguyên an toàn.`,
        order
      });
    } catch (err: any) {
      console.error("Error cancelling import order:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 10: Xóa Phiếu Nhập Hàng (DELETE alias to cancel)
  app.delete("/api/import-orders/:id", extractUserIfPresent, async (req, res) => {
    try {
      const orderId = req.params.id;
      const prodsPath = path.join(DATA_DIR, "products.json");
      const suppPath = path.join(DATA_DIR, "suppliers.json");
      const imeisPath = path.join(DATA_DIR, "imeis.json");
      const ordersPath = path.join(DATA_DIR, "import_orders.json");

      const products = await readJSON<any[]>(prodsPath, []);
      const suppliers = await readJSON<any[]>(suppPath, []);
      const imeis = await readJSON<any[]>(imeisPath, []);
      const importOrders = await readJSON<any[]>(ordersPath, []);

      const orderIdx = importOrders.findIndex(o => o.id === orderId);
      if (orderIdx === -1) {
        return res.status(404).json({ success: false, error: "Không tìm thấy phiếu nhập hàng cần xóa" });
      }

      const order = importOrders[orderIdx];
      if (order.status !== 'cancelled') {
        const orderImeis = imeis.filter(i => i.importOrderId === order.id);
        const soldImeis = orderImeis.filter(i => i.status === 'sold' || !i.in_stock || i.invoiceId || i.repairTicketId);
        if (soldImeis.length > 0) {
          return res.status(400).json({
            success: false,
            error: "Không thể xóa phiếu nhập vì các IMEI trong phiếu này đã được xuất bán!"
          });
        }

        for (const item of order.items) {
          const pIdx = products.findIndex(p => p.id === item.productId || p.sku === item.productId);
          if (pIdx !== -1) {
            products[pIdx].stock = Math.max(0, (products[pIdx].stock || 0) - Number(item.quantity || 0));
          }
        }
        const orderImeiStrings = new Set<string>();
        orderImeis.forEach(i => orderImeiStrings.add(i.imei));
        order.items.forEach(it => (it.imeis || []).forEach(im => orderImeiStrings.add(im)));
        const remainingImeis = imeis.filter(i => i.importOrderId !== order.id && !orderImeiStrings.has(i.imei));
        await writeJSONSafe(imeisPath, remainingImeis, { backup: true });

        const supIdx = suppliers.findIndex(s => s.id === order.supplierId);
        if (supIdx !== -1 && order.debtAmount > 0) {
          suppliers[supIdx].currentDebt = Math.max(0, (suppliers[supIdx].currentDebt || 0) - Number(order.debtAmount || 0));
          await writeJSONSafe(suppPath, suppliers, { backup: true });
        }
        await writeJSONSafe(prodsPath, products, { backup: true });
      }

      const updatedOrders = importOrders.filter(o => o.id !== orderId);
      await writeJSONSafe(ordersPath, updatedOrders, { backup: true });

      res.json({ success: true, message: `Đã xóa phiếu nhập hàng ${order.orderCode}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API 11: Backup Status & File Integrity Monitor (Admin Only)
  app.get("/api/storage/backups", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const collections = ["products", "customers", "invoices", "repairs", "warranties", "categories", "users", "settings", "imeis", "debts", "suppliers", "import_orders", "activities"];
      const backupReport = collections.map(name => {
        const jsonPath = path.join(DATA_DIR, `${name}.json`);
        const bakPath = path.join(DATA_DIR, `${name}.json.bak`);

        const jsonExists = fs.existsSync(jsonPath);
        const bakExists = fs.existsSync(bakPath);

        const jsonStat = jsonExists ? fs.statSync(jsonPath) : null;
        const bakStat = bakExists ? fs.statSync(bakPath) : null;

        return {
          collection: name,
          jsonFile: `${name}.json`,
          jsonExists,
          jsonSize: jsonStat ? jsonStat.size : 0,
          jsonModifiedAt: jsonStat ? jsonStat.mtime.toISOString() : null,
          bakFile: `${name}.json.bak`,
          bakExists,
          bakSize: bakStat ? bakStat.size : 0,
          bakModifiedAt: bakStat ? bakStat.mtime.toISOString() : null
        };
      });

      res.json({
        success: true,
        report: backupReport,
        storageDirectory: DATA_DIR,
        checkedAt: new Date().toISOString()
      });
    } catch (err: any) {
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
    console.log(`🚀 Máy chủ Backend bảo mật đang chạy trên cổng ${PORT}`);
    console.log(`🔒 Xác thực JWT & Băm mật khẩu Bcrypt đã được kích hoạt`);
    console.log(`🛡️ Phân quyền RBAC & Lọc dữ liệu nhạy cảm Server-side: Sẵn sàng`);
    console.log(`📂 Thư mục lưu trữ: ${DATA_DIR}`);
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
