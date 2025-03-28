const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const Short = require('../model/short');
const Circle = require('../model/circle');
const User = require('../model/user');
const CURRENT_URL = process.env.CURRENT_URL
// 确保上传目录存在
const uploadDir = path.join(__dirname, '../public/uploads/videos/shorts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制100MB
  }
});

// 修改后的短视频上传接口（无事务版本）
router.post('/upload', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: '视频文件不能为空' });
    }

    // 1. 检查圈子是否存在
    const circle = await Circle.findById(req.body.circleId);
    if (!circle) {
      return res.status(404).json({ 
        status: 'error',
        message: '圈子不存在'
      });
    }

    // 2. 检查用户是否为圈子成员
    const isMember = circle.members.some(memberId => 
      memberId.toString() === req.user.id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ 
        status: 'error',
        message: '您不是该圈子成员，无法上传视频'
      });
    }

    // 3. 解析标签
    let tags = [];
    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch (e) {
        return res.status(400).json({ 
          status: 'error',
          message: '标签格式不正确'
        });
      }
    }

    // 4. 创建短视频
    const newShort = await Short.create({
      title: req.body.title,
      videoUrl: `/uploads/videos/shorts/${req.file.filename}`,
      description: req.body.description || '',
      user: req.user.id,
      circle: req.body.circleId,
      tags: tags
    });

    // 5. 更新用户的 shortVideos 数组
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { shortVideos: newShort._id } }
    );

    // 6. 更新圈子的 postCount
    await Circle.findByIdAndUpdate(
      req.body.circleId,
      { $inc: { postCount: 1 } }
    );

    res.status(201).json({
      status: 'success',
      data: newShort
    });
  } catch (error) {
    console.error('上传失败:', error);
    
    // 如果有需要，可以在这里添加清理逻辑（比如删除已上传的文件）
    if (req.file) {
      fs.unlink(path.join(uploadDir, req.file.filename), () => {});
    }

    res.status(500).json({ 
      status: 'error',
      message: error.message || '服务器内部错误'
    });
  }
});

router.get('/', async (req, res) => {
  try {
    // 从查询参数中获取分页信息
    const page = parseInt(req.query.page) || 1; // 当前页码，默认为1
    const limit = parseInt(req.query.limit) || 10; // 每页条数，默认为10

    // 从查询参数中获取排序信息
    const sortBy = req.query.sortBy || 'likes'; // 排序字段，默认为 likes
    const sortOrder = parseInt(req.query.sortOrder) || -1; // 排序顺序，默认为降序

    // 验证排序字段和顺序
    const validSortFields = ['likes', 'comments', 'favorites', 'publishedAt'];
    const validSortOrders = [1, -1];

    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ status: 'error', message: '无效的排序字段' });
    }
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({ status: 'error', message: '无效的排序顺序' });
    }

    // 计算跳过的文档数量
    const skip = (page - 1) * limit;

    // 动态排序规则
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;
    const shorts = await Short.find({})
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('user', 'username avatar')
      .populate('circle', 'name avatar')
      .select('-__v') // 只排除 __v 字段

    // 格式化数据
    const formattedShorts = shorts.map(short => {
      short = short.toObject();
      
      // 格式化发布时间
      const publishTime = new Date(short.publishedAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-');

      // 拼接完整URL
      short.videoUrl = CURRENT_URL + short.videoUrl;
      short.user.avatar = CURRENT_URL + short.user.avatar;
      short.circle.avatar = CURRENT_URL + short.circle.avatar;

      return {
        videoId: short._id,
        userAvatar: short.user.avatar,
        userName: short.user.username,
        title: short.title,
        videoUrl: short.videoUrl,
        description: short.description,
        publishTime: publishTime,
        likes: short.likes,
        comments: short.comments,
        favorites: short.favorites,
        circleAvatar: short.circle.avatar,
        circleName: short.circle.name,
        tags: short.tags || [] // 添加 tags 字段
      };
    });

    // 返回结果
    res.status(200).json({
      status: 'success',
      message: '短视频列表获取成功',
      shorts: formattedShorts
    });
  } catch (error) {
    console.error('获取短视频列表失败:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误'
    });
  }
});

module.exports = router;