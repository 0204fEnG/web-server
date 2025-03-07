const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const circleModel = require('../model/circle'); // 请确保路径正确

const circleRouter = express.Router();

// 创建上传目录（如果不存在）
const uploadDir = path.join(__dirname, '../public/uploads/avatar/circle');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置Multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机字符串 + 扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `circle-${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器（只允许图片类型）
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// 修改后的创建圈子接口
circleRouter.post('/create', upload.single('avatar'), async (req, res) => {
  try {
    // 从请求体中提取数据
    const { name, description } = req.body;
    const creator = req.body.creator; // 实际项目中应该从认证信息中获取

    // 验证必填字段
    if (!name || !creator) {
      // 如果已经上传了文件，需要删除
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 检查圈子名称是否已存在
    const existingCircle = await circleModel.findOne({ name });
    if (existingCircle) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: '该圈子名称已存在' });
    }

    // 构建头像URL路径
    const avatarPath = req.file 
      ? `/uploads/avatar/circle/${req.file.filename}`
      : '/default-circle-avatar.png'; // 设置默认头像路径

    // 创建圈子实例
    const newCircle = new circleModel({
      name,
      description: description || '',
      avatar: avatarPath,
      creator,
      members: [creator]
    });

    // 保存到数据库
    const savedCircle = await newCircle.save();

    // 返回成功响应
    res.status(201).json({
      message: '圈子创建成功',
      circle: {
        ...savedCircle.toObject(),
        avatarUrl: `${process.env.BASE_URL || 'http://localhost:3000'}${avatarPath}`
      }
    });

  } catch (error) {
    // 错误处理
    console.error('创建圈子失败:', error);

    // 删除已上传的文件（如果有）
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    const statusCode = error instanceof multer.MulterError 
      ? 400 
      : 500;

    const errorMessage = error instanceof multer.MulterError
      ? error.message
      : '创建圈子失败';

    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


circleRouter.get('/', async (req, res) => {
    try {
        // 查询条件
        const query = req.query;
        const { page = 1, limit = 10, name, sort } = query;

        // 构建查询对象
        const filter = {};
        if (name) {
            filter.name = { $regex: name, $options: 'i' }; // 模糊搜索圈子名称
        }

        // 分页和排序
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: sort ? JSON.parse(sort) : { createdAt: -1 } // 默认按创建时间降序排列
        };

        // 查询圈子列表
        const circles = await circleModel.paginate(filter, options);

        // 返回成功响应
        res.status(200).json({
            message: '获取圈子列表成功',
            data: circles
        });
    } catch (error) {
        // 错误处理
        console.error('获取圈子列表失败:', error);
        res.status(500).json({
            error: '获取圈子列表失败',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
module.exports = circleRouter;