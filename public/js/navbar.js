// Module quản lý Vai Trò & Phân Quyền (RBAC) trên thanh Navbar
document.addEventListener('DOMContentLoaded', async () => {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  // Tải danh sách Users mẫu
  let users = [
    { username: 'c##admin_it', fullname: 'Nguyễn Văn An (IT Head)', role: 'c##role_quan_tri_chuoi', role_display: 'Quản Trị Chuỗi', type: 'COMMON_ROLE', container: 'CDB$ROOT' },
    { username: 'c##giam_doc', fullname: 'Lê Hoàng Minh (Tổng Giám Đốc)', role: 'c##role_ban_giam_doc', role_display: 'Ban Giám Đốc', type: 'COMMON_ROLE', container: 'CDB$ROOT' },
    { username: 'q1_quanly', fullname: 'Trần Minh Tâm (Cửa hàng trưởng Q1)', role: 'ROLE_QUAN_LY_CHI_NHANH', role_display: 'Quản Lý Q1', type: 'LOCAL_ROLE', container: 'pdb_quan1' },
    { username: 'q1_thungan01', fullname: 'Phạm Thu Hà (Thu ngân POS Q1)', role: 'ROLE_THU_NGAN', role_display: 'Thu Ngân Q1', type: 'LOCAL_ROLE', container: 'pdb_quan1' },
    { username: 'q1_thukho01', fullname: 'Đỗ Tuấn Kiệt (Thủ kho Q1)', role: 'ROLE_NHAN_VIEN_KHO', role_display: 'Thủ Kho Q1', type: 'LOCAL_ROLE', container: 'pdb_quan1' }
  ];

  try {
    const res = await API.getUsers();
    if (res.success && res.data.length > 0) {
      users = res.data;
    }
  } catch (e) {
    // dùng danh sách mặc định
  }

  const currentUser = API.getCurrentUser();

  // Tạo phần tử Dropdown chọn Role trên Navbar
  const roleSelector = document.createElement('div');
  roleSelector.style.display = 'flex';
  roleSelector.style.alignItems = 'center';
  roleSelector.style.gap = '0.5rem';
  roleSelector.style.marginLeft = '0.75rem';
  roleSelector.style.paddingLeft = '0.75rem';
  roleSelector.style.borderLeft = '1px solid rgba(255, 255, 255, 0.2)';

  const roleBadgeType = currentUser.type === 'COMMON_ROLE'
    ? '<span style="background: #a855f7; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">COMMON</span>'
    : '<span style="background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">LOCAL PDB</span>';

  roleSelector.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: flex-end;">
      <div style="font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 0.35rem;">
        <i class="fa-solid fa-user-shield"></i> Vai trò (${currentUser.container}):
        ${roleBadgeType}
      </div>
      <select id="navbar-role-switcher" style="background: #1e293b; color: white; border: 1px solid #475569; border-radius: 4px; padding: 3px 6px; font-size: 0.8rem; cursor: pointer; outline: none;">
        ${users.map(u => `
          <option value="${u.username}" ${u.username === currentUser.username ? 'selected' : ''}>
            ${u.fullname} [${u.role}]
          </option>
        `).join('')}
      </select>
    </div>
  `;

  navLinks.appendChild(roleSelector);

  // Xử lý khi người dùng đổi vai trò
  document.getElementById('navbar-role-switcher').addEventListener('change', (e) => {
    const selectedUser = users.find(u => u.username === e.target.value);
    if (selectedUser) {
      API.setCurrentUser(selectedUser);
      window.location.reload();
    }
  });

  // Áp dụng kiểm tra quyền cho từng trang
  applyPagePermissions(currentUser);
});

// Hàm kiểm tra và giới hạn quyền giao diện theo đúng nguyên tắc Least Privilege
function applyPagePermissions(user) {
  const path = window.location.pathname;

  // 1. Kiểm tra trên trang Bán hàng POS (pos.html)
  if (path.endsWith('pos.html')) {
    // Chỉ Thu ngân, Quản lý chi nhánh hoặc IT Admin mới được thanh toán
    const canCheckout = ['c##role_quan_tri_chuoi', 'ROLE_QUAN_LY_CHI_NHANH', 'ROLE_THU_NGAN'].includes(user.role);
    const checkoutBtn = document.getElementById('btn-checkout');
    if (checkoutBtn && !canCheckout) {
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = '0.5';
      checkoutBtn.title = 'Tài khoản vai trò Thủ Kho không có quyền lập hoá đơn thu tiền!';
      
      const alertBox = document.getElementById('trigger-alert');
      if (alertBox) {
        alertBox.className = 'alert alert-warning';
        alertBox.innerHTML = `
          <i class="fa-solid fa-shield-halved fa-lg"></i>
          <div>
            <strong>Giới hạn quyền (Oracle Role):</strong> Bạn đang đăng nhập với vai trò <code>${user.role}</code>. Theo chuẩn phân quyền, chỉ vai trò <code>ROLE_THU_NGAN</code> mới được cấp quyền tạo hóa đơn.
          </div>
        `;
        alertBox.style.display = 'flex';
      }
    }
  }

  // 2. Kiểm tra trên trang Kho (inventory.html)
  if (path.endsWith('inventory.html')) {
    // Thu ngân không được nhập kho hoặc điều chuyển kho
    const canManageStock = ['c##role_quan_tri_chuoi', 'ROLE_QUAN_LY_CHI_NHANH', 'ROLE_NHAN_VIEN_KHO'].includes(user.role);
    if (!canManageStock) {
      const actionAlert = document.getElementById('action-alert');
      if (actionAlert) {
        actionAlert.className = 'alert alert-warning';
        actionAlert.innerHTML = `
          <i class="fa-solid fa-shield-halved fa-lg"></i>
          <div>
            <strong>Hạn chế vai trò:</strong> Vai trò <code>ROLE_THU_NGAN</code> không có quyền can thiệp tồn kho (không có quyền EXECUTE trên <code>SP_NHAP_KHO</code>). Mọi biến động kho phải do <code>ROLE_NHAN_VIEN_KHO</code> thực hiện.
          </div>
        `;
        actionAlert.style.display = 'flex';
      }
    }
  }

  // 3. Kiểm tra trên trang Báo cáo Cross-PDB (reports.html)
  if (path.endsWith('reports.html')) {
    const isCommonRole = user.type === 'COMMON_ROLE';
    if (!isCommonRole) {
      const header = document.querySelector('.page-header');
      if (header) {
        const warn = document.createElement('div');
        warn.className = 'alert alert-danger';
        warn.style.width = '100%';
        warn.style.marginTop = '1rem';
        warn.innerHTML = `
          <i class="fa-solid fa-lock fa-lg"></i>
          <div>
            <strong>Cảnh báo phân quyền Oracle Multitenant:</strong> Bạn đang đăng nhập bằng <strong>Local User (${user.username})</strong> trong PDB. Mệnh đề <code>CONTAINERS()</code> yêu cầu quyền thực thi từ <strong>CDB$ROOT</strong> với <strong>Common Role</strong> (<code>c##role_ban_giam_doc</code> hoặc <code>c##role_quan_tri_chuoi</code>). Hãy chuyển sang tài khoản Ban Giám Đốc trên góc phải để xem đầy đủ!
          </div>
        `;
        header.parentNode.insertBefore(warn, header.nextSibling);
      }
    }
  }
}
