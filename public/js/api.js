// Client API Helper kết nối tới Backend Node.js / Express
const API_BASE = '/api';

const API = {
  // Lấy danh sách chi nhánh PDB
  async getBranches() {
    const res = await fetch(`${API_BASE}/branches`);
    return await res.json();
  },

  // Lấy danh mục sản phẩm
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    return await res.json();
  },

  // Lấy sản phẩm kèm tồn kho theo chi nhánh
  async getProducts(ma_cn, ma_dm = '', search = '') {
    let url = `${API_BASE}/products?`;
    if (ma_cn) url += `ma_cn=${encodeURIComponent(ma_cn)}&`;
    if (ma_dm) url += `ma_dm=${encodeURIComponent(ma_dm)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    const res = await fetch(url);
    return await res.json();
  },

  // Lấy tồn kho chi nhánh
  async getInventory(branchId) {
    const res = await fetch(`${API_BASE}/inventory/branch/${branchId}`);
    return await res.json();
  },

  // Nhập hàng vào kho
  async importStock(data) {
    const res = await fetch(`${API_BASE}/inventory/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Điều chuyển kho giữa 2 PDB
  async transferStock(data) {
    const res = await fetch(`${API_BASE}/inventory/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Lấy lịch sử biến động kho (Audit log)
  async getAuditLogs(ma_cn = '') {
    const url = ma_cn ? `${API_BASE}/inventory/logs?ma_cn=${ma_cn}` : `${API_BASE}/inventory/logs`;
    const res = await fetch(url);
    return await res.json();
  },

  // Tạo đơn hàng / Hoá đơn bán lẻ
  async createOrder(orderData) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return await res.json();
  },

  // Lấy danh sách đơn hàng
  async getOrders(ma_cn = '') {
    const url = ma_cn ? `${API_BASE}/orders?ma_cn=${ma_cn}` : `${API_BASE}/orders`;
    const res = await fetch(url);
    return await res.json();
  },

  // Báo cáo doanh thu Cross-PDB
  async getCrossPdbRevenue() {
    const res = await fetch(`${API_BASE}/reports/revenue`);
    return await res.json();
  },

  // Báo cáo tồn kho Cross-PDB
  async getCrossPdbInventory() {
    const res = await fetch(`${API_BASE}/reports/inventory-cross-pdb`);
    return await res.json();
  },

  // Báo cáo sản phẩm bán chạy
  async getTopProducts() {
    const res = await fetch(`${API_BASE}/reports/top-products`);
    return await res.json();
  },

  // Lấy danh sách Roles
  async getRoles() {
    const res = await fetch(`${API_BASE}/roles`);
    return await res.json();
  },

  // Lấy danh sách Users
  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    return await res.json();
  },

  // Quản lý Role / User session trên Client
  getCurrentUser() {
    const stored = localStorage.getItem('megamart_user');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    // Mặc định là Quản trị chuỗi
    return {
      username: 'c##admin_it',
      fullname: 'Nguyễn Văn An (IT Head)',
      role: 'c##role_quan_tri_chuoi',
      container: 'CDB$ROOT',
      role_name: 'Quản Trị Viên Chuỗi (IT Admin)',
      type: 'COMMON_ROLE'
    };
  },

  setCurrentUser(user) {
    localStorage.setItem('megamart_user', JSON.stringify(user));
  }
};
