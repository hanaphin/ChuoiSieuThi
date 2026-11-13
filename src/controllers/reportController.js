const { state } = require('../config/db');

// Báo cáo Cross-PDB: Doanh thu hợp nhất toàn chuỗi
// Mô phỏng câu truy vấn: SELECT CON_ID_TO_CON_NAME(CON_ID), SUM(TONG_TIEN) FROM CONTAINERS(HOADON) GROUP BY CON_ID
function getCrossPdbRevenue(req, res) {
  try {
    const branchStats = state.branches.map(b => {
      const orders = state.invoices.filter(i => i.ma_cn === b.ma_cn && i.trang_thai === 'DA_THANH_TOAN');
      const totalRevenue = orders.reduce((sum, i) => sum + i.tong_tien, 0);
      return {
        ma_cn: b.ma_cn,
        ten_cn: b.ten_cn,
        pdb_name: b.pdb_name,
        so_luong_don: orders.length,
        doanh_thu: totalRevenue,
        gia_tri_tb: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0
      };
    });

    const grandTotal = branchStats.reduce((sum, b) => sum + b.doanh_thu, 0);
    const totalOrders = branchStats.reduce((sum, b) => sum + b.so_luong_don, 0);

    res.json({
      success: true,
      query_type: 'ORACLE 23ai CROSS-PDB CONTAINERS() QUERY',
      session_container: 'CDB$ROOT',
      user: 'c##admin_chuoi',
      summary: {
        tong_doanh_thu_toan_chuoi: grandTotal,
        tong_so_don_toan_chuoi: totalOrders,
        so_pdb_hoat_dong: branchStats.length
      },
      branch_breakdown: branchStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Báo cáo Cross-PDB: So sánh tồn kho toàn hệ thống xuyên suốt các PDB
function getCrossPdbInventory(req, res) {
  try {
    const comparison = state.products.map(p => {
      const stockQ1 = state.inventory.find(i => i.ma_cn === 'CN_Q1' && i.ma_sp === p.ma_sp)?.so_luong_ton || 0;
      const stockQ7 = state.inventory.find(i => i.ma_cn === 'CN_Q7' && i.ma_sp === p.ma_sp)?.so_luong_ton || 0;
      const stockTD = state.inventory.find(i => i.ma_cn === 'CN_TD' && i.ma_sp === p.ma_sp)?.so_luong_ton || 0;
      const total = stockQ1 + stockQ7 + stockTD;

      return {
        ma_sp: p.ma_sp,
        ten_sp: p.ten_sp,
        don_vi_tinh: p.don_vi_tinh,
        gia_niem_yet: p.gia_niem_yet,
        ton_pdb_quan1: stockQ1,
        ton_pdb_quan7: stockQ7,
        ton_pdb_thuduc: stockTD,
        tong_ton_toan_chuoi: total,
        canh_bao: stockQ1 <= 5 || stockQ7 <= 5 || stockTD <= 5
      };
    });

    res.json({
      success: true,
      query_type: 'ORACLE 23ai CONTAINERS(TONKHO) CROSS-PDB PIVOT',
      data: comparison
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Báo cáo Top 5 sản phẩm bán chạy nhất hệ thống
function getTopSellingProducts(req, res) {
  try {
    const productSales = {};

    state.invoices.forEach(inv => {
      if (inv.trang_thai === 'DA_THANH_TOAN' && inv.items) {
        inv.items.forEach(item => {
          if (!productSales[item.ma_sp]) {
            productSales[item.ma_sp] = {
              ma_sp: item.ma_sp,
              ten_sp: item.ten_sp,
              so_luong_ban: 0,
              doanh_thu: 0
            };
          }
          productSales[item.ma_sp].so_luong_ban += item.so_luong;
          productSales[item.ma_sp].doanh_thu += item.thanh_tien;
        });
      }
    });

    const topList = Object.values(productSales)
      .sort((a, b) => b.so_luong_ban - a.so_luong_ban)
      .slice(0, 5);

    res.json({
      success: true,
      data: topList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getCrossPdbRevenue,
  getCrossPdbInventory,
  getTopSellingProducts
};
