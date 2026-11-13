const { state } = require('../config/db');

// Lấy danh sách chi nhánh (Mỗi chi nhánh tương ứng 1 Pluggable Database - PDB)
function getBranches(req, res) {
  try {
    const branchesWithStats = state.branches.map(b => {
      // Tính sơ bộ tổng đơn và doanh thu hiện tại của PDB này
      const branchInvoices = state.invoices.filter(inv => inv.ma_cn === b.ma_cn && inv.trang_thai === 'DA_THANH_TOAN');
      const totalRevenue = branchInvoices.reduce((sum, inv) => sum + inv.tong_tien, 0);
      const totalOrders = branchInvoices.length;
      const lowStockItems = state.inventory.filter(i => i.ma_cn === b.ma_cn && i.so_luong_ton <= i.nguong_canh_bao).length;

      return {
        ...b,
        totalRevenue,
        totalOrders,
        lowStockItems,
        pdb_status: 'OPEN (READ WRITE)',
        oracle_service: `${b.pdb_name}.localdomain`
      };
    });

    res.json({
      success: true,
      data: branchesWithStats,
      cdb_root: {
        container_name: 'CDB$ROOT',
        common_user: 'c##admin_chuoi',
        total_pdbs: state.branches.length,
        status: 'OPEN'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Lấy chi tiết 1 chi nhánh
function getBranchById(req, res) {
  const { id } = req.params;
  const branch = state.branches.find(b => b.ma_cn === id || b.pdb_name === id);
  if (!branch) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh/PDB tương ứng!' });
  }
  res.json({ success: true, data: branch });
}

// Lấy danh sách Roles (Common Roles & Local Roles)
function getRoles(req, res) {
  res.json({
    success: true,
    total: state.roles.length,
    data: state.roles
  });
}

// Lấy danh sách Người dùng mẫu theo từng Role
function getUsers(req, res) {
  res.json({
    success: true,
    total: state.users.length,
    data: state.users
  });
}

module.exports = {
  getBranches,
  getBranchById,
  getRoles,
  getUsers
};
