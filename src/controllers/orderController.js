const { state } = require('../config/db');

// Tạo đơn hàng / Hoá đơn bán lẻ tại Chi nhánh (Minh hoạ Stored Procedure & Trigger)
function createOrder(req, res) {
  try {
    const { ma_cn, thu_ngan, ten_kh, phuong_thuc, items } = req.body;

    if (!ma_cn || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đơn hàng không hợp lệ (cần mã chi nhánh và danh sách sản phẩm)!'
      });
    }

    const branch = state.branches.find(b => b.ma_cn === ma_cn);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Chi nhánh/PDB không tồn tại!' });
    }

    if (branch.trang_thai !== 'HOAT_DONG') {
      return res.status(400).json({
        success: false,
        message: `Lỗi PL/SQL (-20002): Chi nhánh ${branch.ten_cn} đang ở trạng thái ${branch.trang_thai}, không thể giao dịch!`
      });
    }

    // =========================================================================
    // MINH HOẠ TRIGGER 1: TRG_CHECK_TONKHO_BEFORE_BAN
    // Kiểm tra toàn vẹn tồn kho TRƯỚC KHI cho phép tạo chi tiết hoá đơn
    // =========================================================================
    for (const item of items) {
      const inv = state.inventory.find(i => i.ma_cn === ma_cn && i.ma_sp === item.ma_sp);
      const prod = state.products.find(p => p.ma_sp === item.ma_sp);
      const prodName = prod ? prod.ten_sp : item.ma_sp;

      if (!inv || inv.so_luong_ton < item.so_luong) {
        const available = inv ? inv.so_luong_ton : 0;
        // Bắt lỗi giống RAISE_APPLICATION_ERROR(-20007) trong Trigger Oracle
        return res.status(400).json({
          success: false,
          oracle_error: 'ORA-20007',
          trigger_name: 'TRG_CHECK_TONKHO_BEFORE_BAN',
          message: `[Kích hoạt Trigger ORA-20007]: Mặt hàng "${prodName}" không đủ tồn kho tại ${branch.ten_cn}! Hiện có: ${available}, Khách mua: ${item.so_luong}. Giao dịch đã bị ROLLBACK!`
        });
      }
    }

    // =========================================================================
    // MINH HOẠ PROCEDURE: SP_TAO_HOADON
    // Tính toán thành tiền, chèn HOADON và CTHOADON
    // =========================================================================
    const ma_hd = `HD_${ma_cn.replace('CN_', '')}_${Date.now().toString().slice(-6)}`;
    let tong_tien = 0;
    const orderDetails = [];

    for (const item of items) {
      const prod = state.products.find(p => p.ma_sp === item.ma_sp);
      const don_gia = prod.gia_niem_yet;
      const thanh_tien = don_gia * item.so_luong;
      tong_tien += thanh_tien;

      orderDetails.push({
        ma_sp: item.ma_sp,
        ten_sp: prod.ten_sp,
        so_luong: item.so_luong,
        don_gia: don_gia,
        thanh_tien: thanh_tien
      });
    }

    // =========================================================================
    // MINH HOẠ TRIGGER 2: TRG_UPDATE_TONKHO_AFTER_BAN
    // Tự động trừ tồn kho và ghi nhật ký LICHSU_TONKHO
    // =========================================================================
    for (const item of items) {
      const inv = state.inventory.find(i => i.ma_cn === ma_cn && i.ma_sp === item.ma_sp);
      const ton_truoc = inv.so_luong_ton;
      inv.so_luong_ton -= item.so_luong;
      const ton_sau = inv.so_luong_ton;

      // Audit Log
      state.auditLogs.unshift({
        ma_log: state.auditLogs.length + 1,
        ma_cn,
        ma_sp: item.ma_sp,
        loai_gd: 'BAN_HANG',
        so_luong: -item.so_luong,
        ton_truoc,
        ton_sau,
        chung_tu: ma_hd,
        thoi_gian: new Date().toISOString(),
        ghi_chu: `Xuất bán theo hoá đơn POS ${ma_hd}`
      });
    }

    const newInvoice = {
      ma_hd,
      ma_cn,
      pdb_name: branch.pdb_name,
      ngay_lap: new Date().toISOString(),
      thu_ngan: thu_ngan || 'Thu ngân POS',
      ten_kh: ten_kh || 'Khách lẻ',
      tong_tien,
      phuong_thuc: phuong_thuc || 'TIEN_MAT',
      trang_thai: 'DA_THANH_TOAN',
      items: orderDetails
    };

    state.invoices.unshift(newInvoice);

    res.json({
      success: true,
      message: `Tạo hoá đơn ${ma_hd} thành công qua Procedure SP_TAO_HOADON! Triggers đã thực thi trừ kho và ghi log.`,
      data: newInvoice,
      plsql_info: {
        procedure: 'PKG_QUANLY_BANHANG.SP_TAO_HOADON',
        triggers_fired: ['TRG_CHECK_TONKHO_BEFORE_BAN', 'TRG_UPDATE_TONKHO_AFTER_BAN'],
        pdb_context: branch.pdb_name
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Lấy danh sách hoá đơn
function getOrders(req, res) {
  const { ma_cn } = req.query;
  let list = state.invoices;
  if (ma_cn) {
    list = list.filter(inv => inv.ma_cn === ma_cn);
  }
  res.json({ success: true, count: list.length, data: list });
}

module.exports = {
  createOrder,
  getOrders
};
