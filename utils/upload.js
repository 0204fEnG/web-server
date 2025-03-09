// utils/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 创建上传目录（如果不存在）
const createUploadDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 配置Multer存储
const configureStorage = (uploadDir) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // 生成唯一文件名：时间戳 + 随机字符串 + 扩展名
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `post-${uniqueSuffix}${ext}`);
    },
  });
};

// 文件过滤器（只允许图片类型）
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 创建上传中间件
const createUploadMiddleware = (uploadDir, fieldName = 'images', maxCount = 9) => {
  createUploadDir(uploadDir); // 确保目录存在
  const storage = configureStorage(uploadDir);
  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 限制5MB
    },
  });
  return upload.array(fieldName, maxCount); // 支持多文件上传
};

module.exports = createUploadMiddleware;