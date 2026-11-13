// Module kết nối cơ sở dữ liệu & Quản lý dữ liệu mô phỏng Multitenant (CDB/PDB)
// Phục vụ Mục 3.3 Đồ án: Đảm bảo giao diện <-> API <-> CSDL hoạt động trơn tru

let oracledb;
try {
  oracledb = require('oracledb');
} catch (e) {
  // oracledb chưa được cài hoặc chưa có instant client
  oracledb = null;
}

// Dữ liệu mô phỏng chuẩn xác kiến trúc Multitenant (CDB/PDB)
const state = {
  branches: [
    { ma_cn: 'CN_Q1', ten_cn: 'Siêu thị MegaMart - Chi nhánh Quận 1', pdb_name: 'pdb_quan1', dia_chi: '120 Hai Bà Trưng, P. Đa Kao, Quận 1, TP.HCM', sdt: '028-38291111', trang_thai: 'HOAT_DONG' },
    { ma_cn: 'CN_Q7', ten_cn: 'Siêu thị MegaMart - Chi nhánh Quận 7', pdb_name: 'pdb_quan7', dia_chi: '469 Nguyễn Hữu Thọ, P. Tân Hưng, Quận 7, TP.HCM', sdt: '028-37752222', trang_thai: 'HOAT_DONG' },
    { ma_cn: 'CN_TD', ten_cn: 'Siêu thị MegaMart - Chi nhánh TP. Thủ Đức', pdb_name: 'pdb_thuduc', dia_chi: '216 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP.HCM', sdt: '028-37223333', trang_thai: 'HOAT_DONG' }
  ],
  categories: [
    { ma_dm: 'DM_TPTS', ten_dm: 'Thực phẩm tươi sống', mo_ta: 'Thịt, cá, rau củ quả, trứng sạch mỗi ngày' },
    { ma_dm: 'DM_DOUONG', ten_dm: 'Đồ uống & Giải khát', mo_ta: 'Sữa tươi, nước ngọt, bia, trà xanh, nước khoáng' },
    { ma_dm: 'DM_HOAMY', ten_dm: 'Hóa mỹ phẩm & Tắm gội', mo_ta: 'Dầu gội, sữa tắm, bột giặt, nước xả vải' },
    { ma_dm: 'DM_DOGIADUNG', ten_dm: 'Đồ gia dụng & Tiện ích', mo_ta: 'Chảo chống dính, nồi cơm điện, hộp bảo quản, khăn giấy' }
  ],
  products: [
    { ma_sp: 'SP001', ma_dm: 'DM_TPTS', barcode: '8936001001', ten_sp: 'Gạo ST25 Ông Cua Túi 5kg', don_vi_tinh: 'Túi', gia_niem_yet: 185000, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300' },
    { ma_sp: 'SP002', ma_dm: 'DM_TPTS', barcode: '8936001002', ten_sp: 'Thịt ba rọi heo MeatDeli 500g', don_vi_tinh: 'Khay', gia_niem_yet: 89000, img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=300' },
    { ma_sp: 'SP003', ma_dm: 'DM_TPTS', barcode: '8936001003', ten_sp: 'Trứng gà tươi Ba Huân Hộp 10 quả', don_vi_tinh: 'Hộp', gia_niem_yet: 32000, img: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300' },
    { ma_sp: 'SP004', ma_dm: 'DM_DOUONG', barcode: '8936002001', ten_sp: 'Sữa tươi tiệt trùng Vinamilk 100% 1L', don_vi_tinh: 'Hộp', gia_niem_yet: 36500, img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300' },
    { ma_sp: 'SP005', ma_dm: 'DM_DOUONG', barcode: '8936002002', ten_sp: 'Nước ngọt Coca-Cola Sleek Lon 320ml', don_vi_tinh: 'Lon', gia_niem_yet: 11000, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300' },
    { ma_sp: 'SP006', ma_dm: 'DM_DOUONG', barcode: '8936002003', ten_sp: 'Bia Heineken Silver Sleek Thùng 24 lon', don_vi_tinh: 'Thùng', gia_niem_yet: 445000, img: 'https://images.unsplash.com/photo-1608270116843-c037ce6c0859?w=300' },
    { ma_sp: 'SP007', ma_dm: 'DM_HOAMY', barcode: '8936003001', ten_sp: 'Dầu gội Clear Men Sạch gàu 630g', don_vi_tinh: 'Chai', gia_niem_yet: 169000, img: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300' },
    { ma_sp: 'SP008', ma_dm: 'DM_HOAMY', barcode: '8936003002', ten_sp: 'Nước giặt OMO Matic Cửa trước Túi 3.6kg', don_vi_tinh: 'Túi', gia_niem_yet: 215000, img: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=300' },
    { ma_sp: 'SP009', ma_dm: 'DM_DOGIADUNG', barcode: '8936004001', ten_sp: 'Chảo chống dính Tefal 24cm', don_vi_tinh: 'Cái', gia_niem_yet: 329000, img: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=300' },
    { ma_sp: 'SP010', ma_dm: 'DM_DOGIADUNG', barcode: '8936004002', ten_sp: 'Bộ 3 hộp thủy tinh Lock&Lock', don_vi_tinh: 'Bộ', gia_niem_yet: 250000, img: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=300' }
  ],
  // Tồn kho riêng biệt theo từng PDB (Chi nhánh)
  inventory: [
    // CN_Q1 (pdb_quan1)
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP001', so_luong_ton: 45, nguong_canh_bao: 10 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP002', so_luong_ton: 25, nguong_canh_bao: 5 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP003', so_luong_ton: 80, nguong_canh_bao: 15 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP004', so_luong_ton: 115, nguong_canh_bao: 20 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP005', so_luong_ton: 190, nguong_canh_bao: 30 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP006', so_luong_ton: 42, nguong_canh_bao: 10 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP007', so_luong_ton: 35, nguong_canh_bao: 8 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP008', so_luong_ton: 40, nguong_canh_bao: 10 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP009', so_luong_ton: 15, nguong_canh_bao: 5 },
    { ma_cn: 'CN_Q1', pdb_name: 'pdb_quan1', ma_sp: 'SP010', so_luong_ton: 20, nguong_canh_bao: 5 },

    // CN_Q7 (pdb_quan7)
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP001', so_luong_ton: 30, nguong_canh_bao: 10 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP002', so_luong_ton: 15, nguong_canh_bao: 5 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP003', so_luong_ton: 60, nguong_canh_bao: 15 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP004', so_luong_ton: 90, nguong_canh_bao: 20 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP005', so_luong_ton: 150, nguong_canh_bao: 30 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP006', so_luong_ton: 60, nguong_canh_bao: 10 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP007', so_luong_ton: 4, nguong_canh_bao: 8 }, // Sắp hết
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP008', so_luong_ton: 24, nguong_canh_bao: 10 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP009', so_luong_ton: 8, nguong_canh_bao: 5 },
    { ma_cn: 'CN_Q7', pdb_name: 'pdb_quan7', ma_sp: 'SP010', so_luong_ton: 12, nguong_canh_bao: 5 },

    // CN_TD (pdb_thuduc)
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP001', so_luong_ton: 65, nguong_canh_bao: 10 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP002', so_luong_ton: 35, nguong_canh_bao: 5 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP003', so_luong_ton: 95, nguong_canh_bao: 15 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP004', so_luong_ton: 110, nguong_canh_bao: 20 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP005', so_luong_ton: 220, nguong_canh_bao: 30 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP006', so_luong_ton: 70, nguong_canh_bao: 10 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP007', so_luong_ton: 42, nguong_canh_bao: 8 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP008', so_luong_ton: 50, nguong_canh_bao: 10 },
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP009', so_luong_ton: 3, nguong_canh_bao: 5 }, // Sắp hết
    { ma_cn: 'CN_TD', pdb_name: 'pdb_thuduc', ma_sp: 'SP010', so_luong_ton: 18, nguong_canh_bao: 5 }
  ],
  invoices: [
    {
      ma_hd: 'HD_Q1_001',
      ma_cn: 'CN_Q1',
      pdb_name: 'pdb_quan1',
      ngay_lap: new Date(Date.now() - 3600000 * 3).toISOString(),
      thu_ngan: 'Thu ngân Q1-01',
      ten_kh: 'Trần Thị Mai',
      tong_tien: 666500,
      phuong_thuc: 'CHUYEN_KHOAN',
      trang_thai: 'DA_THANH_TOAN',
      items: [
        { ma_sp: 'SP001', ten_sp: 'Gạo ST25 Ông Cua Túi 5kg', so_luong: 1, don_gia: 185000, thanh_tien: 185000 },
        { ma_sp: 'SP004', ten_sp: 'Sữa tươi tiệt trùng Vinamilk 100% 1L', so_luong: 1, don_gia: 36500, thanh_tien: 36500 },
        { ma_sp: 'SP006', ten_sp: 'Bia Heineken Silver Sleek Thùng 24 lon', so_luong: 1, don_gia: 445000, thanh_tien: 445000 }
      ]
    },
    {
      ma_hd: 'HD_Q7_001',
      ma_cn: 'CN_Q7',
      pdb_name: 'pdb_quan7',
      ngay_lap: new Date(Date.now() - 3600000 * 2).toISOString(),
      thu_ngan: 'Thu ngân Q7-02',
      ten_kh: 'Phạm Hoàng Nam',
      tong_tien: 384000,
      phuong_thuc: 'TIEN_MAT',
      trang_thai: 'DA_THANH_TOAN',
      items: [
        { ma_sp: 'SP007', ten_sp: 'Dầu gội Clear Men Sạch gàu 630g', so_luong: 1, don_gia: 169000, thanh_tien: 169000 },
        { ma_sp: 'SP008', ten_sp: 'Nước giặt OMO Matic Cửa trước Túi 3.6kg', so_luong: 1, don_gia: 215000, thanh_tien: 215000 }
      ]
    },
    {
      ma_hd: 'HD_TD_001',
      ma_cn: 'CN_TD',
      pdb_name: 'pdb_thuduc',
      ngay_lap: new Date(Date.now() - 3600000 * 1).toISOString(),
      thu_ngan: 'Thu ngân TD-01',
      ten_kh: 'Đặng Thu Hà',
      tong_tien: 579000,
      phuong_thuc: 'VI_DIEN_TU',
      trang_thai: 'DA_THANH_TOAN',
      items: [
        { ma_sp: 'SP009', ten_sp: 'Chảo chống dính Tefal 24cm', so_luong: 1, don_gia: 329000, thanh_tien: 329000 },
        { ma_sp: 'SP010', ten_sp: 'Bộ 3 hộp thủy tinh Lock&Lock', so_luong: 1, don_gia: 250000, thanh_tien: 250000 }
      ]
    }
  ],
  auditLogs: [
    { ma_log: 1, ma_cn: 'CN_Q1', ma_sp: 'SP001', loai_gd: 'BAN_HANG', so_luong: -1, ton_truoc: 46, ton_sau: 45, chung_tu: 'HD_Q1_001', thoi_gian: new Date().toISOString() },
    { ma_log: 2, ma_cn: 'CN_Q7', ma_sp: 'SP007', loai_gd: 'BAN_HANG', so_luong: -1, ton_truoc: 5, ton_sau: 4, chung_tu: 'HD_Q7_001', thoi_gian: new Date().toISOString() }
  ],
  // DANH SÁCH 5 ROLES THEO CHUẨN ORACLE 23ai MULTITENANT
  roles: [
    {
      role_name: 'c##role_quan_tri_chuoi',
      display_name: 'Quản Trị Viên Chuỗi (IT Admin)',
      type: 'COMMON_ROLE',
      scope: 'CDB$ROOT (Toàn hệ thống)',
      description: 'Toàn quyền cấu hình container, quản trị PDBs, phân quyền người dùng'
    },
    {
      role_name: 'c##role_ban_giam_doc',
      display_name: 'Ban Giám Đốc (Auditor / Executive)',
      type: 'COMMON_ROLE',
      scope: 'CDB$ROOT (Toàn hệ thống)',
      description: 'Chỉ đọc, xem báo cáo Cross-PDB doanh thu và đối soát toàn chuỗi'
    },
    {
      role_name: 'ROLE_QUAN_LY_CHI_NHANH',
      display_name: 'Cửa Hàng Trưởng (Store Manager)',
      type: 'LOCAL_ROLE',
      scope: 'Local PDB (Chi nhánh sở tại)',
      description: 'Quản lý toàn bộ vận hành hàng hóa, duyệt điều chuyển kho, xem hóa đơn chi nhánh'
    },
    {
      role_name: 'ROLE_THU_NGAN',
      display_name: 'Nhân Viên Thu Ngân (Cashier POS)',
      type: 'LOCAL_ROLE',
      scope: 'Local PDB (Chi nhánh sở tại)',
      description: 'Thực thi SP_TAO_HOADON, bán hàng, không được tự ý sửa tồn kho'
    },
    {
      role_name: 'ROLE_NHAN_VIEN_KHO',
      display_name: 'Thủ Kho Chi Nhánh (Inventory Keeper)',
      type: 'LOCAL_ROLE',
      scope: 'Local PDB (Chi nhánh sở tại)',
      description: 'Thực thi SP_NHAP_KHO, SP_DIEUCHUYEN_KHO, theo dõi bảng LICHSU_TONKHO'
    }
  ],
  // DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG MẪU ĐỒNG BỘ VỚI FILE 07_create_roles_privileges.sql
  users: [
    { 
      username: 'c##admin_it', 
      password: 'ITAdmin2026#',
      fullname: 'Nguyễn Văn An', 
      chuc_vu: 'Trưởng Phòng CNTT Chuỗi (IT Head)', 
      role: 'c##role_quan_tri_chuoi', 
      role_display: 'Quản Trị Viên Chuỗi',
      type: 'COMMON_ROLE', 
      container: 'CDB$ROOT', 
      ma_cn: null 
    },
    { 
      username: 'c##giam_doc', 
      password: 'Director2026#',
      fullname: 'Lê Hoàng Minh', 
      chuc_vu: 'Tổng Giám Đốc Chuỗi Siêu Thị', 
      role: 'c##role_ban_giam_doc', 
      role_display: 'Ban Giám Đốc',
      type: 'COMMON_ROLE', 
      container: 'CDB$ROOT', 
      ma_cn: null 
    },
    { 
      username: 'q1_quanly', 
      password: 'Q1Manager2026#',
      fullname: 'Trần Minh Tâm', 
      chuc_vu: 'Cửa Hàng Trưởng Siêu Thị Q1', 
      role: 'ROLE_QUAN_LY_CHI_NHANH', 
      role_display: 'Quản Lý Chi Nhánh',
      type: 'LOCAL_ROLE', 
      container: 'pdb_quan1', 
      ma_cn: 'CN_Q1' 
    },
    { 
      username: 'q1_thungan01', 
      password: 'Q1Cashier2026#',
      fullname: 'Phạm Thu Hà', 
      chuc_vu: 'Nhân Viên Thu Ngân POS Q1', 
      role: 'ROLE_THU_NGAN', 
      role_display: 'Thu Ngân POS',
      type: 'LOCAL_ROLE', 
      container: 'pdb_quan1', 
      ma_cn: 'CN_Q1' 
    },
    { 
      username: 'q1_thukho01', 
      password: 'Q1Keeper2026#',
      fullname: 'Đỗ Tuấn Kiệt', 
      chuc_vu: 'Thủ Kho Siêu Thị Q1', 
      role: 'ROLE_NHAN_VIEN_KHO', 
      role_display: 'Thủ Kho Chi Nhánh',
      type: 'LOCAL_ROLE', 
      container: 'pdb_quan1', 
      ma_cn: 'CN_Q1' 
    },
    { 
      username: 'q7_thungan01', 
      password: 'Q7Cashier2026#',
      fullname: 'Ngô Thảo My', 
      chuc_vu: 'Nhân Viên Thu Ngân POS Q7', 
      role: 'ROLE_THU_NGAN', 
      role_display: 'Thu Ngân POS',
      type: 'LOCAL_ROLE', 
      container: 'pdb_quan7', 
      ma_cn: 'CN_Q7' 
    },
    { 
      username: 'td_thungan01', 
      password: 'TDCashier2026#',
      fullname: 'Vũ Đức Thịnh', 
      chuc_vu: 'Nhân Viên Thu Ngân POS Thủ Đức', 
      role: 'ROLE_THU_NGAN', 
      role_display: 'Thu Ngân POS',
      type: 'LOCAL_ROLE', 
      container: 'pdb_thuduc', 
      ma_cn: 'CN_TD' 
    }
  ]
};

module.exports = {
  state,
  oracledb
};
