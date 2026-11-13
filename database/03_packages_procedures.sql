-- ============================================================================
-- ĐỀ TÀI 1: HỆ THỐNG QUẢN LÝ CHUỖI SIÊU THỊ ĐA CHI NHÁNH
-- FILE 03: PL/SQL PACKAGES, PROCEDURES & FUNCTIONS CÓ XỬ LÝ EXCEPTION
-- ============================================================================

-- ĐẶC TẢ PACKAGE (PACKAGE SPECIFICATION)
CREATE OR REPLACE PACKAGE PKG_QUANLY_BANHANG AS
    -- User-defined Exceptions
    e_khong_du_ton_kho EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_khong_du_ton_kho, -20001);
    
    e_chi_nhanh_dong_cua EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_chi_nhanh_dong_cua, -20002);
    
    e_san_pham_khong_ton_tai EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_san_pham_khong_ton_tai, -20003);

    -- 1. Procedure tạo hoá đơn và chi tiết hoá đơn tại chi nhánh PDB
    PROCEDURE SP_TAO_HOADON (
        p_ma_hd         IN VARCHAR2,
        p_ma_cn         IN VARCHAR2,
        p_thu_ngan      IN NVARCHAR2,
        p_ten_kh        IN NVARCHAR2,
        p_phuong_thuc   IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong      IN NUMBER,
        p_thanh_tien    OUT NUMBER,
        p_ket_qua       OUT VARCHAR2
    );

    -- 2. Procedure nhập hàng vào kho chi nhánh
    PROCEDURE SP_NHAP_KHO (
        p_ma_cn         IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong      IN NUMBER,
        p_ghi_chu       IN NVARCHAR2,
        p_ket_qua       OUT VARCHAR2
    );

    -- 3. Procedure điều chuyển tồn kho giữa hai chi nhánh
    PROCEDURE SP_DIEUCHUYEN_KHO (
        p_ma_cn_nguon   IN VARCHAR2,
        p_ma_cn_dich    IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong      IN NUMBER,
        p_ghi_chu       IN NVARCHAR2,
        p_ket_qua       OUT VARCHAR2
    );

    -- 4. Function tính doanh thu chi nhánh trong khoảng thời gian
    FUNCTION FN_DOANHTHU_CHI_NHANH (
        p_ma_cn         IN VARCHAR2,
        p_tu_ngay       IN DATE,
        p_den_ngay      IN DATE
    ) RETURN NUMBER;

    -- 5. Function kiểm tra tình trạng tồn kho của sản phẩm
    FUNCTION FN_KIEMTRA_CON_HANG (
        p_ma_cn         IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong_can  IN NUMBER
    ) RETURN BOOLEAN;

END PKG_QUANLY_BANHANG;
/

-- THÂN PACKAGE (PACKAGE BODY)
CREATE OR REPLACE PACKAGE BODY PKG_QUANLY_BANHANG AS

    -- Hiện thực Function kiểm tra còn hàng
    FUNCTION FN_KIEMTRA_CON_HANG (
        p_ma_cn         IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong_can  IN NUMBER
    ) RETURN BOOLEAN IS
        v_ton_hien_tai NUMBER := 0;
    BEGIN
        SELECT NVL(SO_LUONG_TON, 0)
        INTO v_ton_hien_tai
        FROM TONKHO
        WHERE MA_CN = p_ma_cn AND MA_SP = p_ma_sp;

        RETURN (v_ton_hien_tai >= p_so_luong_can);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN FALSE;
    END FN_KIEMTRA_CON_HANG;

    -- Hiện thực Function tính doanh thu chi nhánh
    FUNCTION FN_DOANHTHU_CHI_NHANH (
        p_ma_cn         IN VARCHAR2,
        p_tu_ngay       IN DATE,
        p_den_ngay      IN DATE
    ) RETURN NUMBER IS
        v_tong_doanh_thu NUMBER(14, 2) := 0;
    BEGIN
        SELECT NVL(SUM(TONG_TIEN), 0)
        INTO v_tong_doanh_thu
        FROM HOADON
        WHERE MA_CN = p_ma_cn
          AND TRANG_THAI = 'DA_THANH_TOAN'
          AND TRUNC(NGAY_LAP) BETWEEN TRUNC(p_tu_ngay) AND TRUNC(p_den_ngay);

        RETURN v_tong_doanh_thu;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN 0;
    END FN_DOANHTHU_CHI_NHANH;

    -- Hiện thực Procedure tạo hoá đơn
    PROCEDURE SP_TAO_HOADON (
        p_ma_hd         IN VARCHAR2,
        p_ma_cn         IN VARCHAR2,
        p_thu_ngan      IN NVARCHAR2,
        p_ten_kh        IN NVARCHAR2,
        p_phuong_thuc   IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong      IN NUMBER,
        p_thanh_tien    OUT NUMBER,
        p_ket_qua       OUT VARCHAR2
    ) IS
        v_gia_sp        NUMBER(12, 2);
        v_ton_kho       NUMBER(10);
        v_trang_thai_cn VARCHAR2(20);
    BEGIN
        -- 1. Kiểm tra trạng thái hoạt động của chi nhánh
        SELECT TRANG_THAI INTO v_trang_thai_cn
        FROM CHINHANH WHERE MA_CN = p_ma_cn;

        IF v_trang_thai_cn != 'HOAT_DONG' THEN
            RAISE_APPLICATION_ERROR(-20002, 'Lỗi: Chi nhánh ' || p_ma_cn || ' hiện không hoạt động!');
        END IF;

        -- 2. Lấy thông tin giá sản phẩm
        SELECT GIA_NIEM_YET INTO v_gia_sp
        FROM SANPHAM WHERE MA_SP = p_ma_sp;

        -- 3. Kiểm tra số lượng tồn kho
        SELECT SO_LUONG_TON INTO v_ton_kho
        FROM TONKHO WHERE MA_CN = p_ma_cn AND MA_SP = p_ma_sp;

        IF v_ton_kho < p_so_luong THEN
            RAISE_APPLICATION_ERROR(-20001, 'Lỗi: Sản phẩm ' || p_ma_sp || ' không đủ tồn kho (Còn lại: ' || v_ton_kho || ', Cần: ' || p_so_luong || ')');
        END IF;

        -- 4. Tính toán thành tiền
        p_thanh_tien := v_gia_sp * p_so_luong;

        -- 5. Tạo Hoá Đơn
        INSERT INTO HOADON (MA_HD, MA_CN, NGAY_LAP, THU_NGAN, TEN_KHACH_HANG, TONG_TIEN, PHUONG_THUC_TT, TRANG_THAI)
        VALUES (p_ma_hd, p_ma_cn, SYSTIMESTAMP, p_thu_ngan, NVL(p_ten_kh, 'Khách lẻ'), p_thanh_tien, p_phuong_thuc, 'DA_THANH_TOAN');

        -- 6. Tạo Chi Tiết Hoá Đơn
        INSERT INTO CTHOADON (MA_HD, MA_SP, SO_LUONG, DON_GIA, THANH_TIEN)
        VALUES (p_ma_hd, p_ma_sp, p_so_luong, v_gia_sp, p_thanh_tien);

        p_ket_qua := 'SUCCESS: Tạo hoá đơn thành công!';
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            p_ket_qua := 'ERROR: Không tìm thấy thông tin sản phẩm hoặc chi nhánh!';
        WHEN DUP_VAL_ON_INDEX THEN
            ROLLBACK;
            p_ket_qua := 'ERROR: Mã hoá đơn đã tồn tại trong hệ thống!';
        WHEN OTHERS THEN
            ROLLBACK;
            p_ket_qua := 'ERROR: ' || SQLERRM;
    END SP_TAO_HOADON;

    -- Hiện thực Procedure Nhập kho
    PROCEDURE SP_NHAP_KHO (
        p_ma_cn         IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong      IN NUMBER,
        p_ghi_chu       IN NVARCHAR2,
        p_ket_qua       OUT VARCHAR2
    ) IS
        v_ton_cu NUMBER := 0;
        v_ton_moi NUMBER := 0;
    BEGIN
        IF p_so_luong <= 0 THEN
            p_ket_qua := 'ERROR: Số lượng nhập kho phải lớn hơn 0!';
            RETURN;
        END IF;

        SELECT NVL(SO_LUONG_TON, 0) INTO v_ton_cu
        FROM TONKHO
        WHERE MA_CN = p_ma_cn AND MA_SP = p_ma_sp;

        v_ton_moi := v_ton_cu + p_so_luong;

        UPDATE TONKHO
        SET SO_LUONG_TON = v_ton_moi,
            CAP_NHAT_CUOI = SYSTIMESTAMP
        WHERE MA_CN = p_ma_cn AND MA_SP = p_ma_sp;

        -- Ghi log nhật ký tồn kho
        INSERT INTO LICHSU_TONKHO (MA_CN, MA_SP, LOAI_GIAO_DICH, SO_LUONG_THAY_DOI, TON_TRUOC, TON_SAU, MA_CHUNG_TU, GHI_CHU)
        VALUES (p_ma_cn, p_ma_sp, 'NHAP_KHO', p_so_luong, v_ton_cu, v_ton_moi, 'NK_' || TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS'), p_ghi_chu);

        p_ket_qua := 'SUCCESS: Nhập kho thành công ' || p_so_luong || ' sản phẩm.';
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            -- Nếu chưa có bản ghi tồn kho thì tạo mới
            INSERT INTO TONKHO (MA_CN, MA_SP, SO_LUONG_TON, NGUONG_CANH_BAO, CAP_NHAT_CUOI)
            VALUES (p_ma_cn, p_ma_sp, p_so_luong, 10, SYSTIMESTAMP);

            INSERT INTO LICHSU_TONKHO (MA_CN, MA_SP, LOAI_GIAO_DICH, SO_LUONG_THAY_DOI, TON_TRUOC, TON_SAU, MA_CHUNG_TU, GHI_CHU)
            VALUES (p_ma_cn, p_ma_sp, 'NHAP_KHO', p_so_luong, 0, p_so_luong, 'NK_NEW', p_ghi_chu);

            p_ket_qua := 'SUCCESS: Đã khởi tạo tồn kho mới cho sản phẩm.';
            COMMIT;
        WHEN OTHERS THEN
            ROLLBACK;
            p_ket_qua := 'ERROR: ' || SQLERRM;
    END SP_NHAP_KHO;

    -- Hiện thực Procedure Điều chuyển kho giữa 2 chi nhánh
    PROCEDURE SP_DIEUCHUYEN_KHO (
        p_ma_cn_nguon   IN VARCHAR2,
        p_ma_cn_dich    IN VARCHAR2,
        p_ma_sp         IN VARCHAR2,
        p_so_luong      IN NUMBER,
        p_ghi_chu       IN NVARCHAR2,
        p_ket_qua       OUT VARCHAR2
    ) IS
        v_ton_nguon NUMBER;
        v_ton_dich  NUMBER;
    BEGIN
        IF p_ma_cn_nguon = p_ma_cn_dich THEN
            p_ket_qua := 'ERROR: Chi nhánh nguồn và đích không được trùng nhau!';
            RETURN;
        END IF;

        SELECT SO_LUONG_TON INTO v_ton_nguon
        FROM TONKHO WHERE MA_CN = p_ma_cn_nguon AND MA_SP = p_ma_sp;

        IF v_ton_nguon < p_so_luong THEN
            p_ket_qua := 'ERROR: Chi nhánh nguồn không đủ tồn kho để điều chuyển!';
            RETURN;
        END IF;

        -- Trừ tại nguồn
        UPDATE TONKHO
        SET SO_LUONG_TON = SO_LUONG_TON - p_so_luong,
            CAP_NHAT_CUOI = SYSTIMESTAMP
        WHERE MA_CN = p_ma_cn_nguon AND MA_SP = p_ma_sp;

        -- Cộng tại đích
        UPDATE TONKHO
        SET SO_LUONG_TON = SO_LUONG_TON + p_so_luong,
            CAP_NHAT_CUOI = SYSTIMESTAMP
        WHERE MA_CN = p_ma_cn_dich AND MA_SP = p_ma_sp;

        p_ket_qua := 'SUCCESS: Điều chuyển thành công ' || p_so_luong || ' sản phẩm từ ' || p_ma_cn_nguon || ' sang ' || p_ma_cn_dich;
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            p_ket_qua := 'ERROR: Không tìm thấy bản ghi tồn kho tương ứng!';
        WHEN OTHERS THEN
            ROLLBACK;
            p_ket_qua := 'ERROR: ' || SQLERRM;
    END SP_DIEUCHUYEN_KHO;

END PKG_QUANLY_BANHANG;
/
