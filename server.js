const path = require('path');
const fs = require('fs');
const http = require('http');

let express = null;
let cors = null;
let dotenv = null;

try {
  express = require('express');
  cors = require('cors');
  dotenv = require('dotenv');
  dotenv.config();
} catch (e) {
  // Dự phòng khi chưa cài npm packages
  express = null;
}

const PORT = process.env.PORT || 3000;
const { state } = require('./src/config/db');
const branchController = require('./src/controllers/branchController');
const productController = require('./src/controllers/productController');
const inventoryController = require('./src/controllers/inventoryController');
const orderController = require('./src/controllers/orderController');
const reportController = require('./src/controllers/reportController');
const authController = require('./src/controllers/authController');

if (express) {
  // KHỞI CHẠY BẰNG EXPRESS SERVER TIÊU CHUẨN KHI ĐÃ CÓ NODE_MODULES
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Phục vụ static files (HTML, CSS, JS)
  app.use(express.static(path.join(__dirname, 'public')));

  // Định tuyến API
  const apiRoutes = require('./src/routes/apiRoutes');
  app.use('/api', apiRoutes);

  // Fallback cho SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log('================================================================');
    console.log(`🚀 HỆ THỐNG QUẢN LÝ CHUỖI SIÊU THỊ ĐA CHI NHÁNH (ORACLE 23ai)`);
    console.log(`🌐 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📦 Kiến trúc: Multitenant Architecture (CDB$ROOT / PDBs)`);
    console.log(`📡 Chế độ: ${process.env.APP_MODE || 'DEMO_MOCK'}`);
    console.log('================================================================');
  });
} else {
  // DỰ PHÒNG NATIVE HTTP SERVER (ZERO DEPENDENCY - CHẠY NGAY LẬP TỨC KHÔNG CẦN CÀI NPM)
  console.log('================================================================');
  console.log(`🚀 HỆ THỐNG QUẢN LÝ CHUỖI SIÊU THỊ ĐA CHI NHÁNH (ORACLE 23ai)`);
  console.log(`🌐 Đang chạy trên Built-in Native HTTP Server tại: http://localhost:${PORT}`);
  console.log(`📦 Chế độ: Zero-Dependency Ready (Không cần đợi npm install)`);
  console.log('================================================================');

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;

    // Thiết lập Header CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Helper giả lập res của Express
    const fakeRes = {
      status(code) {
        res.statusCode = code;
        return this;
      },
      json(data) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      }
    };

    // Helper giả lập req
    const fakeReq = {
      query: Object.fromEntries(url.searchParams.entries()),
      params: {},
      body: {}
    };

    // 1. Định tuyến API
    if (pathname.startsWith('/api/')) {
      // Đọc body nếu là POST/PUT
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; });
      req.on('end', () => {
        try {
          fakeReq.body = bodyData ? JSON.parse(bodyData) : {};
        } catch (e) {
          fakeReq.body = {};
        }

        // Auth Routes
        if (pathname === '/api/auth/login' && req.method === 'POST') {
          return authController.login(fakeReq, fakeRes);
        }
        if (pathname === '/api/auth/profile') {
          return authController.getProfile(fakeReq, fakeRes);
        }

        // Branch Routes
        if (pathname === '/api/branches') {
          return branchController.getBranches(fakeReq, fakeRes);
        }
        if (pathname === '/api/roles') {
          return branchController.getRoles(fakeReq, fakeRes);
        }
        if (pathname === '/api/users') {
          return branchController.getUsers(fakeReq, fakeRes);
        }
        if (pathname.startsWith('/api/branches/')) {
          fakeReq.params.id = pathname.replace('/api/branches/', '');
          return branchController.getBranchById(fakeReq, fakeRes);
        }

        // Product & Category Routes
        if (pathname === '/api/categories') {
          return productController.getCategories(fakeReq, fakeRes);
        }
        if (pathname === '/api/products') {
          return productController.getProducts(fakeReq, fakeRes);
        }

        // Inventory Routes
        if (pathname.startsWith('/api/inventory/branch/')) {
          fakeReq.params.branchId = pathname.replace('/api/inventory/branch/', '');
          return inventoryController.getInventoryByBranch(fakeReq, fakeRes);
        }
        if (pathname === '/api/inventory/import' && req.method === 'POST') {
          return inventoryController.importStock(fakeReq, fakeRes);
        }
        if (pathname === '/api/inventory/transfer' && req.method === 'POST') {
          return inventoryController.transferStock(fakeReq, fakeRes);
        }
        if (pathname === '/api/inventory/logs') {
          return inventoryController.getAuditLogs(fakeReq, fakeRes);
        }

        // Order Routes
        if (pathname === '/api/orders') {
          if (req.method === 'POST') {
            return orderController.createOrder(fakeReq, fakeRes);
          } else {
            return orderController.getOrders(fakeReq, fakeRes);
          }
        }

        // Report Routes
        if (pathname === '/api/reports/revenue') {
          return reportController.getCrossPdbRevenue(fakeReq, fakeRes);
        }
        if (pathname === '/api/reports/inventory-cross-pdb') {
          return reportController.getCrossPdbInventory(fakeReq, fakeRes);
        }
        if (pathname === '/api/reports/top-products') {
          return reportController.getTopSellingProducts(fakeReq, fakeRes);
        }

        fakeRes.status(404).json({ success: false, message: 'API Endpoint not found' });
      });
      return;
    }

    // 2. Static File Serving
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(__dirname, 'public', 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Lỗi máy chủ nội bộ');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });
  });

  server.listen(PORT, () => {
    console.log(`🌐 Server đã sẵn sàng phục vụ tại: http://localhost:${PORT}`);
  });
}
