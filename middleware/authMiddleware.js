const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // 从请求头获取 Token
  if (!token) {
    return res.status(401).json({ status: "error", message: "未授权，请登录" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // 验证 Token
    req.user = decoded; // 将用户信息存入请求对象
    next(); // 继续执行后续路由
  } catch (error) {
    return res.status(403).json({ status: "error", message: "Token 失效，请重新登录" });
  }
};

module.exports = authMiddleware;