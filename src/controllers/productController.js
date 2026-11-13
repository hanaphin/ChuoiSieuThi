const { state } = require('../config/db');

// Lấy danh sách ngành hàng (Danh mục)
function getCategories(req, res) {
  res.json({ success: true, data: state.categories });
}

// Lấy danh sách sản phẩm (kèm tồn kho theo chi nhánh nếu có query ma_cn)
function getProducts(req, res) {
  const { ma_cn, ma_dm, search } = req.query;

  let result = state.products.map(p => {
    let stock = 0;
    let warningThreshold = 10;
    if (ma_cn) {
      const inv = state.inventory.find(i => i.ma_cn === ma_cn && i.ma_sp === p.ma_sp);
      stock = inv ? inv.so_luong_ton : 0;
      warningThreshold = inv ? inv.nguong_canh_bao : 10;
    }
    const cat = state.categories.find(c => c.ma_dm === p.ma_dm);
    return {
      ...p,
      ten_dm: cat ? cat.ten_dm : '',
      stock_at_branch: stock,
      is_low_stock: stock <= warningThreshold
    };
  });

  if (ma_dm) {
    result = result.filter(p => p.ma_dm === ma_dm);
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p => p.ten_sp.toLowerCase().includes(q) || p.barcode.includes(q) || p.ma_sp.toLowerCase().includes(q));
  }

  res.json({ success: true, data: result });
}

module.exports = {
  getCategories,
  getProducts
};
