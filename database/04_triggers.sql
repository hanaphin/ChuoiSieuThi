-- ============================================================================
-- ĐỀ TÀI 1: HỆ THỐNG QUẢN LÝ CHUỖI SIÊU THỊ ĐA CHI NHÁNH
-- FILE 04: TRIGGERS BẢO ĐẢM TÍNH TOÀN VẸN VÀ TỰ ĐỘNG ĐỒNG BỘ TỒN KHO
-- ============================================================================

-- TRIGGER 1: KIỂM TRA TỒN KHO TRƯỚC KHI THÊM CHI TIẾT HOÁ ĐƠN
-- Mục tiêu: Chặn bán hàng nếu số lượng mua vượt quá số lượng tồn kho thực tế tại chi nhánh
CREATE OR REPLACE TRIGGER TRG_CHECK_TONKHO_BEFORE_BAN
BEFORE INSERT ON CTHOADON
FOR EACH ROW
DECLARE
    v_ma_cn      VARCHAR2(20);
    v_ton_kho    NUMBER(10) := 0;
    v_ten_sp     NVARCHAR2(200);
BEGIN
    -- Lấy mã chi nhánh từ bảng HOADON cha
    SELECT MA_CN INTO v_ma_cn
    FROM HOADON
    WHERE MA_HD = :NEW.MA_HD;

    -- Lấy thông tin tên sản phẩm
    SELECT TEN_SP INTO v_ten_sp
    FROM SANPHAM
    WHERE MA_SP = :NEW.MA_SP;

    -- Kiểm tra số lượng tồn hiện tại của sản phẩm tại chi nhánh tương ứng
    BEGIN
        SELECT NVL(SO_LUONG_TON, 0)
        INTO v_ton_kho
        FROM TONKHO
        WHERE MA_CN = v_ma_cn AND MA_SP = :NEW.MA_SP;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20005, 'Lỗi: Sản phẩm [' || v_ten_sp || '] chưa được nhập vào kho chi nhánh ' || v_ma_cn || '!');
    END;

    -- Kiểm tra số lượng mua
    IF :NEW.SO_LUONG <= 0 THEN
        RAISE_APPLICATION_ERROR(-20006, 'Lỗi: Số lượng mua phải lớn hơn 0!');
    END IF;

    IF v_ton_kho < :NEW.SO_LUONG THEN
        RAISE_APPLICATION_ERROR(-20007, 'Lỗi bán hàng: Sản phẩm [' || v_ten_sp || '] không đủ tồn kho! Hiện có: ' || v_ton_kho || ', Khách mua: ' || :NEW.SO_LUONG);
    END IF;
END;
/

-- TRIGGER 2: TỰ ĐỘNG TRỪ TỒN KHO VÀ GHI NHẬT KÝ KIỂM TOÁN SAU KHI BÁN HÀNG
CREATE OR REPLACE TRIGGER TRG_UPDATE_TONKHO_AFTER_BAN
AFTER INSERT ON CTHOADON
FOR EACH ROW
DECLARE
    v_ma_cn      VARCHAR2(20);
    v_ton_truoc  NUMBER(10);
    v_ton_sau    NUMBER(10);
BEGIN
    -- Lấy mã chi nhánh từ bảng HOADON
    SELECT MA_CN INTO v_ma_cn
    FROM HOADON
    WHERE MA_HD = :NEW.MA_HD;

    -- Lấy tồn kho trước khi trừ
    SELECT SO_LUONG_TON INTO v_ton_truoc
    FROM TONKHO
    WHERE MA_CN = v_ma_cn AND MA_SP = :NEW.MA_SP;

    v_ton_sau := v_ton_truoc - :NEW.SO_LUONG;

    -- Cập nhật trừ tồn kho tại chi nhánh
    UPDATE TONKHO
    SET SO_LUONG_TON = v_ton_sau,
        CAP_NHAT_CUOI = SYSTIMESTAMP
    WHERE MA_CN = v_ma_cn AND MA_SP = :NEW.MA_SP;

    -- Ghi nhật ký vào bảng kiểm toán LICHSU_TONKHO
    INSERT INTO LICHSU_TONKHO (
        MA_CN,
        MA_SP,
        LOAI_GIAO_DICH,
        SO_LUONG_THAY_DOI,
        TON_TRUOC,
        TON_SAU,
        MA_CHUNG_TU,
        THOI_GIAN,
        GHI_CHU
    ) VALUES (
        v_ma_cn,
        :NEW.MA_SP,
        'BAN_HANG',
        -:NEW.SO_LUONG,
        v_ton_truoc,
        v_ton_sau,
        :NEW.MA_HD,
        SYSTIMESTAMP,
        'Xuất kho bán hàng theo hoá đơn ' || :NEW.MA_HD
    );
END;
/
