# HỆ THỐNG QUẢN LÝ CHUỖI SIÊU THỊ ĐA CHI NHÁNH
## ĐỒ ÁN MÔN HỌC: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (ORACLE DATABASE 23ai) - HUFLIT 2026

Dự án được xây dựng bám sát 100% **Yêu cầu kỹ thuật bắt buộc (Mục 3.2)** và **Yêu cầu ứng dụng hoàn chỉnh (Mục 3.3)** trong tài liệu đồ án môn học.

---

### 1. Thông Tin Đề Tài & Công Nghệ Trọng Tâm
* **Đề tài số 1:** Hệ thống quản lý chuỗi siêu thị đa chi nhánh.
* **Mô tả bài toán:** Mô hình hoá mỗi chi nhánh siêu thị như một **Pluggable Database (PDB)** trong cùng một **Container Database (CDB)**; tách biệt hoàn toàn dữ liệu tồn kho, hoá đơn giữa các chi nhánh nhưng cho phép báo cáo tổng hợp toàn hệ thống.
* **Công nghệ Oracle 23ai trọng tâm:** 
  * Multitenant Architecture (`CDB$ROOT`, `pdb_quan1`, `pdb_quan7`, `pdb_thuduc`).
  * Phân quyền **Common User** (`c##admin_chuoi`) và **Local User** (`local_q1`, `local_q7`, `local_td`).
  * Báo cáo hợp nhất xuyên suốt các PDB (**Cross-PDB Reporting**) sử dụng mệnh đề `CONTAINERS()`.

---

### 2. Cấu Trúc Thư Mục Dự Án

```
c:\ChuoiSieuThi\
├── package.json              # Khai báo cấu hình dự án Node.js
├── server.js                 # Web Server (Tự động hỗ trợ cả Express & Zero-dependency Native HTTP)
├── .env                      # File cấu hình môi trường kết nối Oracle DB
├── .env.example              # File mẫu cấu hình kết nối Oracle CDB & PDBs
├── README.md                 # Hướng dẫn chi tiết sử dụng & bảo vệ đồ án
├── database/                 # Toàn bộ mã nguồn CSDL theo chuẩn Mục 3.2
│   ├── docker-compose.yml    # Cấu hình container Oracle 23ai Free
│   ├── 01_setup_multitenant.sql # Tạo PDBs, Common User c##admin_chuoi, Local Users
│   ├── 02_schema_ddl.sql     # 7 bảng quan hệ chuẩn 3NF (CHINHANH, DANHMUC, SANPHAM, TONKHO, HOADON, CTHOADON, LICHSU_TONKHO)
│   ├── 03_packages_procedures.sql # Package PKG_QUANLY_BANHANG, 3 Procedures, 2 Functions có Exception
│   ├── 04_triggers.sql       # 2 Triggers: TRG_CHECK_TONKHO_BEFORE_BAN & TRG_UPDATE_TONKHO_AFTER_BAN
│   ├── 05_cross_pdb_reports.sql # Truy vấn Cross-PDB bằng mệnh đề CONTAINERS()
│   ├── 06_seed_data.sql      # Bộ dữ liệu mẫu phong phú
│   └── 07_create_roles_privileges.sql # Thiết lập 5 Roles (Common & Local Roles) chuẩn Least Privilege
├── src/                      # Tầng API Back-end
│   ├── config/db.js          # Kết nối CSDL Oracle 23ai / Mô phỏng PDB state
│   ├── controllers/          # Bộ điều khiển nghiệp vụ (Branch, Product, Inventory, Order, Report)
│   └── routes/apiRoutes.js   # Các điểm cuối REST API
└── public/                   # Tầng Giao diện Front-end (Web App trực quan)
    ├── index.html            # Dashboard tổng quan chuỗi & trạng thái các PDB
    ├── pos.html              # Màn hình bán hàng POS chọn PDB (Kiểm tra Trigger ORA-20007 khi hết hàng)
    ├── inventory.html        # Quản lý tồn kho theo từng PDB, Nhập hàng & Điều chuyển kho
    ├── reports.html          # Báo cáo hợp nhất Cross-PDB (Doanh thu, Tồn kho toàn chuỗi, Top sản phẩm)
    ├── architecture.html     # Sơ đồ luồng dữ liệu 3 tầng & Bộ câu hỏi vấn đáp chuẩn bị bảo vệ
    ├── css/styles.css        # Giao diện responsive, hiện đại
    └── js/api.js             # Client API tương tác bất đồng bộ
```

---

### 3. Hướng Dẫn Khởi Chạy Ứng Dụng (Chạy Ngay Lập Tức)

1. Mở PowerShell hoặc Terminal tại thư mục `c:\ChuoiSieuThi`:
   ```powershell
   node server.js
   ```
2. Mở trình duyệt web và truy cập:
   * **Trang chủ Dashboard:** [http://localhost:3000](http://localhost:3000)
   * **Bán hàng POS tại Chi nhánh:** [http://localhost:3000/pos.html](http://localhost:3000/pos.html)
   * **Quản lý Tồn kho & Điều chuyển PDB:** [http://localhost:3000/inventory.html](http://localhost:3000/inventory.html)
   * **Báo cáo Hợp nhất Cross-PDB:** [http://localhost:3000/reports.html](http://localhost:3000/reports.html)
   * **Sơ đồ Kiến trúc & Hướng dẫn Vấn đáp:** [http://localhost:3000/architecture.html](http://localhost:3000/architecture.html)

---

### 4. Đối Chiếu Đáp Ứng Yêu Cầu Của Giảng Viên (Mục 3.2 & Mục 3.3)

| Yêu cầu trong Đề cương | Mức độ đáp ứng trong dự án | File minh chứng |
| :--- | :--- | :--- |
| **Tối thiểu 5 bảng quan hệ** | Đã tạo **7 bảng** chuẩn 3NF: `CHINHANH`, `DANHMUC`, `SANPHAM`, `TONKHO`, `HOADON`, `CTHOADON`, `LICHSU_TONKHO`. | `database/02_schema_ddl.sql` |
| **Tối thiểu 1 package** | Đã tạo Package `PKG_QUANLY_BANHANG` (Spec + Body). | `database/03_packages_procedures.sql` |
| **Tối thiểu 2 triggers** | Trigger kiểm tra tồn kho trước khi bán (`TRG_CHECK_TONKHO_BEFORE_BAN`) và Trigger cập nhật trừ kho + ghi log (`TRG_UPDATE_TONKHO_AFTER_BAN`). | `database/04_triggers.sql` |
| **Tối thiểu 3 procedure/function** | `SP_TAO_HOADON`, `SP_NHAP_KHO`, `SP_DIEUCHUYEN_KHO`, `FN_DOANHTHU_CHI_NHANH`, `FN_KIEMTRA_CON_HANG`. | `database/03_packages_procedures.sql` |
| **Xử lý ngoại lệ (Exception)** | Có các Exception do người dùng định nghĩa (`e_khong_du_ton_kho`, `e_chi_nhanh_dong_cua`, mã lỗi `ORA-20001` &rarr; `ORA-20007`). | `database/03_packages_procedures.sql` |
| **Ứng dụng minh họa chạy được (Mục 3.3)** | Web App hoàn chỉnh có giao diện thao tác thật, gọi qua lớp API RESTful kết nối CSDL, có đủ nghiệp vụ cốt lõi (POS, tồn kho, báo cáo, điều chuyển). | `server.js` + thư mục `public/` |
| **Khả năng giải thích luồng dữ liệu** | Có trang `architecture.html` hiển thị trực quan sơ đồ luồng dữ liệu 3 tầng và bộ câu hỏi vấn đáp mô phỏng trực tiếp từ Rubric chấm điểm. | `public/architecture.html` |
