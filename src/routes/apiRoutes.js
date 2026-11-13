const express = require('express');
const router = express.Router();

const branchController = require('../controllers/branchController');
const productController = require('../controllers/productController');
const inventoryController = require('../controllers/inventoryController');
const orderController = require('../controllers/orderController');
const reportController = require('../controllers/reportController');

// 1. Chi nhánh & PDB
router.get('/branches', branchController.getBranches);
router.get('/branches/:id', branchController.getBranchById);

// 2. Danh mục & Sản phẩm
router.get('/categories', productController.getCategories);
router.get('/products', productController.getProducts);

// 3. Tồn kho PDB & Điều chuyển
router.get('/inventory/branch/:branchId', inventoryController.getInventoryByBranch);
router.post('/inventory/import', inventoryController.importStock);
router.post('/inventory/transfer', inventoryController.transferStock);
router.get('/inventory/logs', inventoryController.getAuditLogs);

// 4. Bán hàng & Hoá đơn
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getOrders);

// 5. Báo cáo Cross-PDB (Multitenant)
router.get('/reports/revenue', reportController.getCrossPdbRevenue);
router.get('/reports/inventory-cross-pdb', reportController.getCrossPdbInventory);
router.get('/reports/top-products', reportController.getTopSellingProducts);

module.exports = router;
