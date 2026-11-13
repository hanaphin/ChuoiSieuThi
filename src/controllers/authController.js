const { state } = require('../config/db');

// Xử lý đăng nhập
function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!'
      });
    }

    // Tìm người dùng trong hệ thống
    const user = state.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác!'
      });
    }

    // Lấy thông tin Role tương ứng
    const roleInfo = state.roles.find(r => r.role_name === user.role) || {};

    // Tạo payload trả về cho client (không bao gồm password)
    const { password: _, ...userProfile } = user;

    res.json({
      success: true,
      message: `Đăng nhập thành công với vai trò: ${user.role_display} (${user.container})`,
      token: `oracle23ai_token_${user.username}_${Date.now()}`,
      user: {
        ...userProfile,
        role_description: roleInfo.description || '',
        scope: roleInfo.scope || user.container
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Lấy thông tin user hiện tại
function getProfile(req, res) {
  const { username } = req.query;
  const user = state.users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
  }
  const { password: _, ...userProfile } = user;
  res.json({ success: true, data: userProfile });
}

module.exports = {
  login,
  getProfile
};
