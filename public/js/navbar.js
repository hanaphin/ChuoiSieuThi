// Module Quản Lý Đăng Nhập, Phiên Làm Việc & Phân Quyền (RBAC) trên Navbar
document.addEventListener('DOMContentLoaded', async () => {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  const currentUser = API.getCurrentUser();
  const currentPath = window.location.pathname;

  // Nếu đang ở trang login thì không chèn navbar auth
  if (currentPath.endsWith('login.html')) return;

  // Lấy danh sách tài khoản mẫu để hỗ trợ chuyển nhanh
  let users = [];
  try {
    const res = await API.getUsers();
    if (res.success && res.data.length > 0) {
      users = res.data;
    }
  } catch (e) {
    users = [];
  }

  const authContainer = document.createElement('div');
  authContainer.style.display = 'flex';
  authContainer.style.alignItems = 'center';
  authContainer.style.gap = '0.65rem';
  authContainer.style.marginLeft = '0.75rem';
  authContainer.style.paddingLeft = '0.75rem';
  authContainer.style.borderLeft = '1px solid rgba(255, 255, 255, 0.2)';

  if (currentUser) {
    // ĐÃ ĐĂNG NHẬP
    const isCommon = currentUser.type === 'COMMON_ROLE';
    const badgeColor = isCommon ? '#a855f7' : '#0284c7';
    const badgeLabel = isCommon ? 'COMMON (CDB)' : `LOCAL (${currentUser.container})`;

    authContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2;">
        <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; font-weight: 700; color: white;">
          <i class="fa-solid fa-circle-user" style="color: #60a5fa;"></i>
          <span>${currentUser.fullname}</span>
          <span style="background: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700;">
            ${badgeLabel}
          </span>
        </div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">
          ${currentUser.role_display || currentUser.role} [<code>${currentUser.username}</code>]
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 0.35rem;">
        ${users.length > 0 ? `
          <select id="quick-role-switch" title="Chuyển nhanh tài khoản demo" style="background: #1e293b; color: #cbd5e1; border: 1px solid #475569; border-radius: 4px; padding: 4px 6px; font-size: 0.75rem; cursor: pointer; outline: none;">
            ${users.map(u => `
              <option value="${u.username}" ${u.username === currentUser.username ? 'selected' : ''}>
                ${u.role_display} (${u.username})
              </option>
            `).join('')}
          </select>
        ` : ''}

        <button onclick="API.logout()" class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 8px; color: #fca5a5; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1);" title="Đăng xuất khỏi hệ thống">
          <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
        </button>
      </div>
    `;

    navLinks.appendChild(authContainer);

    // Bắt sự kiện chuyển nhanh tài khoản
    const switchSelect = document.getElementById('quick-role-switch');
    if (switchSelect) {
      switchSelect.addEventListener('change', (e) => {
        const target = users.find(u => u.username === e.target.value);
        if (target) {
          const { password: _, ...cleanProfile } = target;
          API.setCurrentUser(cleanProfile, `token_${cleanProfile.username}`);
          window.location.reload();
        }
      });
    }

    // Áp dụng kiểm tra quyền cho vai trò hiện hành
    applyPagePermissions(currentUser);
    updateNavbarBadges(currentUser);

  } else {
    // CHƯA ĐĂNG NHẬP
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-primary" style="font-size: 0.8rem; padding: 5px 12px;">
        <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập
      </a>
    `;
    navLinks.appendChild(authContainer);

    // Nếu vào các trang nghiệp vụ mà chưa đăng nhập -> yêu cầu đăng nhập
    if (currentPath.endsWith('pos.html') || currentPath.endsWith('inventory.html') || currentPath.endsWith('reports.html')) {
      const container = document.querySelector('.container');
      if (container) {
        const authBanner = document.createElement('div');
        authBanner.className = 'alert alert-warning';
        authBanner.innerHTML = `
          <i class="fa-solid fa-lock fa-lg"></i>
          <div style="flex: 1;">
            <strong>Bạn chưa đăng nhập:</strong> Hệ thống yêu cầu xác thực vai trò Oracle để thực hiện các nghiệp vụ ghi/báo cáo. 
          </div>
          <a href="login.html" class="btn btn-warning" style="font-size: 0.8rem; padding: 4px 10px;">
            Đăng nhập ngay
          </a>
        `;
        container.insertBefore(authBanner, container.firstChild);
      }
    }
  }
});

// Hàm kiểm tra và giới hạn quyền giao diện theo đúng nguyên tắc Least Privilege
function applyPagePermissions(user) {
  const path = window.location.pathname;

  // 1. Kiểm tra trên trang Bán hàng POS (pos.html)
  if (path.endsWith('pos.html')) {
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

// Cập nhật biểu tượng khoá trên thanh Navbar theo quyền của Role
function updateNavbarBadges(user) {
  if (!user) return;

  const links = document.querySelectorAll('.nav-links .nav-link');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    // POS tab
    if (href.includes('pos.html')) {
      const canPOS = ['c##role_quan_tri_chuoi', 'ROLE_QUAN_LY_CHI_NHANH', 'ROLE_THU_NGAN'].includes(user.role);
      if (!canPOS) {
        link.innerHTML = `<i class="fa-solid fa-lock" style="color: #f87171;"></i> Bán hàng (POS)`;
        link.title = 'Bị khoá: Thủ Kho không có quyền bán hàng POS';
        link.style.opacity = '0.6';
      }
    }

    // Inventory tab
    if (href.includes('inventory.html')) {
      const canInv = ['c##role_quan_tri_chuoi', 'ROLE_QUAN_LY_CHI_NHANH', 'ROLE_NHAN_VIEN_KHO'].includes(user.role);
      if (!canInv) {
        link.innerHTML = `<i class="fa-solid fa-lock" style="color: #f87171;"></i> Kho PDB`;
        link.title = 'Bị khoá: Thu Ngân không có quyền quản lý kho';
        link.style.opacity = '0.6';
      }
    }

    // Reports tab
    if (href.includes('reports.html')) {
      const isCommon = user.type === 'COMMON_ROLE';
      if (!isCommon) {
        link.innerHTML = `<i class="fa-solid fa-lock" style="color: #f87171;"></i> Báo cáo Cross-PDB`;
        link.title = 'Bị khoá: Chỉ Common Role (Ban Giám Đốc/Admin) tại CDB$ROOT mới được xem';
        link.style.opacity = '0.6';
      }
    }
  });
}
