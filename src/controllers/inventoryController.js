const { state } = require('../config/db');

// Lấy danh sách tồn kho theo chi nhánh (PDB)
function getInventoryByBranch(req, res) {
  const { branchId } = req.params;
  const branch = state.branches.find(b => b.ma_cn === branchId);

  if (!branch) {
    return res.status(404).json({ success: false, message: 'Chi nhánh không tồn tại!' });
  }

  const items = state.inventory
    .filter(i => i.ma_cn === branchId)
    .map(i => {
      const prod = state.products.find(p => p.ma_sp === i.ma_sp) || {};
      const cat = state.categories.find(c => c.ma_dm === prod.ma_dm) || {};
      return {
        ...i,
        ten_sp: prod.ten_sp,
        barcode: prod.barcode,
        don_vi_tinh: prod.don_vi_tinh,
        gia_niem_yet: prod.gia_niem_yet,
        ten_dm: cat.ten_dm,
        is_low_stock: i.so_luong_ton <= i.nguong_canh_bao
      };
    });

  res.json({
    success: true,
    branch,
    total_items: items.length,
    data: items
  });
}

// Nhập hàng vào kho (Mô phỏng Procedure PKG_QUANLY_BANHANG.SP_NHAP_KHO)
function importStock(req, res) {
  const { ma_cn, ma_sp, so_luong, ghi_chu } = req.body;

  if (!ma_cn || !ma_sp || !so_luong || Number(so_luong) <= 0) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp chi nhánh, sản phẩm và số lượng hợp lệ (> 0)!' });
  }

  const qty = parseInt(so_luong, 10);
  let inv = state.inventory.find(i => i.ma_cn === ma_cn && i.ma_sp === ma_sp);
  const branch = state.branches.find(b => b.ma_cn === ma_cn);
  const prod = state.products.find(p => p.ma_sp === ma_sp);

  if (!branch || !prod) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy chi nhánh hoặc sản phẩm!' });
  }

  const ton_truoc = inv ? inv.so_luong_ton : 0;
  const ton_sau = ton_truoc + qty;

  if (inv) {
    inv.so_luong_ton = ton_sau;
  } else {
    inv = {
      ma_cn,
      pdb_name: branch.pdb_name,
      ma_sp,
      so_luong_ton: ton_sau,
      nguong_canh_bao: 10
    };
    state.inventory.push(inv);
  }

  // Ghi nhật ký vào LICHSU_TONKHO
  const newLog = {
    ma_log: state.auditLogs.length + 1,
    ma_cn,
    ma_sp,
    loai_gd: 'NHAP_KHO',
    so_luong: qty,
    ton_truoc,
    ton_sau,
    chung_tu: `NK_${Date.now()}`,
    thoi_gian: new Date().toISOString(),
    ghi_chu: ghi_chu || 'Nhập hàng vào kho'
  };
  state.auditLogs.unshift(newLog);

  res.json({
    success: true,
    message: `Đã thực thi PKG_QUANLY_BANHANG.SP_NHAP_KHO thành công: Nhập +${qty} ${prod.ten_sp} vào ${branch.ten_cn}`,
    data: {
      ma_cn,
      ma_sp,
      ton_truoc,
      ton_sau,
      log: newLog
    }
  });
}

// Điều chuyển kho giữa 2 PDB (Mô phỏng Procedure PKG_QUANLY_BANHANG.SP_DIEUCHUYEN_KHO)
function transferStock(req, res) {
  const { ma_cn_nguon, ma_cn_dich, ma_sp, so_luong, ghi_chu } = req.body;

  if (ma_cn_nguon === ma_cn_dich) {
    return res.status(400).json({ success: false, message: 'Chi nhánh nguồn và đích không được trùng nhau!' });
  }

  const qty = parseInt(so_luong, 10);
  if (!qty || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Số lượng điều chuyển phải lớn hơn 0!' });
  }

  const invNguon = state.inventory.find(i => i.ma_cn === ma_cn_nguon && i.ma_sp === ma_sp);
  const invDich = state.inventory.find(i => i.ma_cn === ma_cn_dich && i.ma_sp === ma_sp);
  const prod = state.products.find(p => p.ma_sp === ma_sp);

  if (!invNguon || invNguon.so_luong_ton < qty) {
    return res.status(400).json({
      success: false,
      message: `Lỗi PL/SQL (-20001): Chi nhánh nguồn không đủ tồn kho! Hiện có: ${invNguon ? invNguon.so_luong_ton : 0}, Cần chuyển: ${qty}`
    });
  }

  // Trừ nguồn
  const tonTruocNguon = invNguon.so_luong_ton;
  invNguon.so_luong_ton -= qty;

  // Cộng đích
  const tonTruocDich = invDich ? invDich.so_luong_ton : 0;
  if (invDich) {
    invDich.so_luong_ton += qty;
  } else {
    const branchDich = state.branches.find(b => b.ma_cn === ma_cn_dich);
    state.inventory.push({
      ma_cn: ma_cn_dich,
      pdb_name: branchDich.pdb_name,
      ma_sp,
      so_luong_ton: qty,
      nguong_canh_bao: 10
    });
  }

  // Ghi log
  const chungTu = `DC_${Date.now()}`;
  state.auditLogs.unshift({
    ma_log: state.auditLogs.length + 1,
    ma_cn: ma_cn_nguon,
    ma_sp,
    loai_gd: 'CHUYEN_DI',
    so_luong: -qty,
    ton_truoc: tonTruocNguon,
    ton_sau: invNguon.so_luong_ton,
    chung_tu: chungTu,
    thoi_gian: new Date().toISOString(),
    ghi_chu: `Chuyển sang ${ma_cn_dich}: ${ghi_chu || ''}`
  });

  state.auditLogs.unshift({
    ma_log: state.auditLogs.length + 1,
    ma_cn: ma_cn_dich,
    ma_sp,
    loai_gd: 'CHUYEN_DEN',
    so_luong: qty,
    ton_truoc: tonTruocDich,
    ton_sau: tonTruocDich + qty,
    chung_tu: chungTu,
    thoi_gian: new Date().toISOString(),
    ghi_chu: `Nhận từ ${ma_cn_nguon}: ${ghi_chu || ''}`
  });

  res.json({
    success: true,
    message: `Đã thực thi PKG_QUANLY_BANHANG.SP_DIEUCHUYEN_KHO: Chuyển ${qty} ${prod.ten_sp} từ ${ma_cn_nguon} sang ${ma_cn_dich}`,
    data: {
      ma_cn_nguon,
      ma_cn_dich,
      ma_sp,
      so_luong: qty
    }
  });
}

// Lấy lịch sử biến động kho
function getAuditLogs(req, res) {
  const { ma_cn } = req.query;
  let logs = state.auditLogs;
  if (ma_cn) {
    logs = logs.filter(l => l.ma_cn === ma_cn);
  }
  res.json({ success: true, data: logs.slice(0, 50) });
}

module.exports = {
  getInventoryByBranch,
  importStock,
  transferStock,
  getAuditLogs
};
