-- ============================================================================
-- ĐỀ TÀI 1: HỆ THỐNG QUẢN LÝ CHUỖI SIÊU THỊ ĐA CHI NHÁNH
-- CÔNG NGHỆ: Oracle 23ai Multitenant Architecture (CDB/PDB)
-- FILE 01: THIẾT LẬP MULTITENANT, PDBs VÀ COMMON/LOCAL USERS
-- ============================================================================

-- Kết nối với quyền SYSDBA tại CDB$ROOT
-- CONNECT sys/Oracle23ai_Password#@localhost:1521/FREE AS SYSDBA;

-- 1. Kiểm tra danh sách các PDB hiện có
SHOW PDBS;

-- 2. Tạo các Pluggable Database (PDB) đại diện cho từng chi nhánh siêu thị
-- Chi nhánh 1: Siêu thị Quận 1
CREATE PLUGGABLE DATABASE pdb_quan1 
ADMIN USER admin_q1 IDENTIFIED BY Q1Pass2026# 
ROLES = (DBA)
FILE_NAME_CONVERT = ('/FREEPDB1/', '/pdb_quan1/');

-- Chi nhánh 2: Siêu thị Quận 7
CREATE PLUGGABLE DATABASE pdb_quan7 
ADMIN USER admin_q7 IDENTIFIED BY Q7Pass2026# 
ROLES = (DBA)
FILE_NAME_CONVERT = ('/FREEPDB1/', '/pdb_quan7/');

-- Chi nhánh 3: Siêu thị TP. Thủ Đức
CREATE PLUGGABLE DATABASE pdb_thuduc 
ADMIN USER admin_td IDENTIFIED BY TDPass2026# 
ROLES = (DBA)
FILE_NAME_CONVERT = ('/FREEPDB1/', '/pdb_thuduc/');

-- 3. Mở các PDB để sẵn sàng phục vụ
ALTER PLUGGABLE DATABASE ALL OPEN;
ALTER PLUGGABLE DATABASE ALL SAVE STATE;

-- 4. Tạo COMMON USER tại CDB$ROOT để quản trị và báo cáo xuyên PDB (Cross-PDB Reporting)
ALTER SESSION SET CONTAINER = CDB$ROOT;

CREATE USER c##admin_chuoi IDENTIFIED BY SuperAdmin2026# 
CONTAINER = ALL;

-- Cấp quyền cho Common User trên toàn bộ Container
GRANT CONNECT, RESOURCE, DBA TO c##admin_chuoi CONTAINER = ALL;
GRANT SELECT ANY TABLE TO c##admin_chuoi CONTAINER = ALL;
GRANT READ ANY TABLE TO c##admin_chuoi CONTAINER = ALL;

-- 5. Tạo LOCAL USERS riêng biệt cho từng PDB (Đảm bảo tính cô lập dữ liệu theo chi nhánh)
-- Cấu hình Local User tại PDB Quận 1
ALTER SESSION SET CONTAINER = pdb_quan1;
CREATE USER local_q1 IDENTIFIED BY Q1Pass2026#;
GRANT CONNECT, RESOURCE TO local_q1;
ALTER USER local_q1 QUOTA UNLIMITED ON USERS;

-- Cấu hình Local User tại PDB Quận 7
ALTER SESSION SET CONTAINER = pdb_quan7;
CREATE USER local_q7 IDENTIFIED BY Q7Pass2026#;
GRANT CONNECT, RESOURCE TO local_q7;
ALTER USER local_q7 QUOTA UNLIMITED ON USERS;

-- Cấu hình Local User tại PDB Thủ Đức
ALTER SESSION SET CONTAINER = pdb_thuduc;
CREATE USER local_td IDENTIFIED BY TDPass2026#;
GRANT CONNECT, RESOURCE TO local_td;
ALTER USER local_td QUOTA UNLIMITED ON USERS;
