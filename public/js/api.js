// Client API Helper kết nối tới Backend Node.js / Express
const API_BASE = '/api';

function getAuthHeaders() {
  const user = API.getCurrentUser();
  const token = localStorage.getItem('megamart_token') || '';
  return {
    'Content-Type': 'application/json',
    'x-user-role': user ? user.role : 'GUEST',
    'x-username': user ? user.username : 'guest',
    'x-container': user ? user.container : 'PUBLIC',
    'Authorization': `Bearer ${token}`
  };
}

const API = {
  // Lấy danh sách chi nhánh PDB
  async getBranches() {
    const res = await fetch(`${API_BASE}/branches`, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Lấy danh mục sản phẩm
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Lấy sản phẩm kèm tồn kho theo chi nhánh
  async getProducts(ma_cn, ma_dm = '', search = '') {
    let url = `${API_BASE}/products?`;
    if (ma_cn) url += `ma_cn=${encodeURIComponent(ma_cn)}&`;
    if (ma_dm) url += `ma_dm=${encodeURIComponent(ma_dm)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Lấy tồn kho chi nhánh
  async getInventory(branchId) {
    const res = await fetch(`${API_BASE}/inventory/branch/${branchId}`, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Nhập hàng vào kho
  async importStock(data) {
    const res = await fetch(`${API_BASE}/inventory/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Điều chuyển kho giữa 2 PDB
  async transferStock(data) {
    const res = await fetch(`${API_BASE}/inventory/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Lấy lịch sử biến động kho (Audit log)
  async getAuditLogs(ma_cn = '') {
    const url = ma_cn ? `${API_BASE}/inventory/logs?ma_cn=${ma_cn}` : `${API_BASE}/inventory/logs`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Tạo đơn hàng / Hoá đơn bán lẻ
  async createOrder(orderData) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData)
    });
    return await res.json();
  },

  // Lấy danh sách đơn hàng
  async getOrders(ma_cn = '') {
    const url = ma_cn ? `${API_BASE}/orders?ma_cn=${ma_cn}` : `${API_BASE}/orders`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Báo cáo doanh thu Cross-PDB
  async getCrossPdbRevenue() {
    const res = await fetch(`${API_BASE}/reports/revenue`, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Báo cáo tồn kho Cross-PDB
  async getCrossPdbInventory() {
    const res = await fetch(`${API_BASE}/reports/inventory-cross-pdb`, { headers: getAuthHeaders() });
    return await res.json();
  },

  // Báo cáo sản phẩm bán chạy
  async getTopProducts() {
    const res = await fetch(`${API_BASE}/reports/top-products`, { headers: getAuthHeaders() });
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

  // Xác thực đăng nhập
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return await res.json();
  },

  logout() {
    localStorage.removeItem('megamart_user');
    localStorage.removeItem('megamart_token');
    window.location.href = 'login.html';
  },

  // Quản lý Role / User session trên Client
  getCurrentUser() {
    const stored = localStorage.getItem('megamart_user');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return null;
  },

  setCurrentUser(user, token) {
    localStorage.setItem('megamart_user', JSON.stringify(user));
    if (token) localStorage.setItem('megamart_token', token);
  }
};
