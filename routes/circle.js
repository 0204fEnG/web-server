const express = require('express');
const circleRouter = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const circleModel = require('../model/circle');
const createUploadMiddleware = require('../utils/upload');
const path = require('path'); // 确保引入了 path 模块
// 动态路径：根据需要设置上传目录
const uploadDir = path.join(__dirname, '../public/uploads/avatar/circle');
const uploadMiddleware = createUploadMiddleware(uploadDir, 'avatar');
const CURRENT_URL = process.env.CURRENT_URL
circleRouter.post(
  '/create',
  authMiddleware, // 添加认证中间件
  uploadMiddleware, // 使用通用上传中间件
  async (req, res) => {
    try {
      // 从请求体中提取数据
      const { name, description } = req.body;
      const creator = req.user.id; // 从认证中间件中获取用户 ID

      // 验证必填字段
      if (!name) {
        // 如果已经上传了文件，需要删除
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            fs.unlinkSync(file.path);
          });
        }
        return res.status(400).json({ error: '圈子名称是必填项' });
      }

      // 检查圈子名称是否已存在
      const existingCircle = await circleModel.findOne({ name });
      if (existingCircle) {
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            fs.unlinkSync(file.path);
          });
        }
        return res.status(400).json({ error: '该圈子名称已存在' });
      }

      // 构建头像URL路径
      let avatarPath;
      if (req.files && req.files.length > 0) {
        // 假设只上传了一个文件，取第一个文件
        const file = req.files[0];
        avatarPath = `/uploads/avatar/circle/${file.filename}`;
      } else {
        avatarPath = '/uploads/avatar/circle/default-circle-avatar.jpeg'; // 设置默认头像路径
      }

      // 创建圈子实例
      const newCircle = new circleModel({
        name,
        description: description || '',
        avatar: avatarPath,
        creator,
        members: [creator], // 将创建者加入成员列表
      });

      // 保存到数据库
      const savedCircle = await newCircle.save();

      // 返回成功响应
      res.status(201).json({
        status: 'success',
        message: '圈子创建成功',
        circle: {
          ...savedCircle.toObject(),
          avatar: `${process.env.CURRENT_URL}${avatarPath}`,
        },
      });
    } catch (error) {
      // 错误处理

      // 删除已上传的文件（如果有）
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }

      const statusCode = error instanceof multer.MulterError ? 400 : 500;

      const errorMessage =
        error instanceof multer.MulterError
          ? error.message
          : '创建圈子失败';

      res.status(statusCode).json({
        status: 'error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);




/**
 * @api {get} /circles 获取圈子列表（分页）
 * @apiName GetCircles
 * @apiGroup Circle
 * @apiParam {Number} [page=1] 当前页码
 * @apiParam {Number} [limit=10] 每页数量
 */
circleRouter.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 构建查询条件
    const options = {
      page,
      limit: Math.min(limit, 50), // 限制最大50条/页
      select: 'name avatar description postCount createdAt members', // 包括 members 字段
      sort: { postCount: -1, createdAt: 1 }, // 按帖子数和创建时间排序
      populate: {
        path: 'creator',
        select: 'username avatar' // 关联创建者信息
      }
    };

    const result = await circleModel.paginate({}, options);

    // 在返回结果中添加成员数量字段并排除 members 列表
    const circlesWithMemberCount = result.docs.map(circle => {
      const circleObject = circle.toObject();
      delete circleObject.members; // 删除 members 字段

      // 格式化 createdAt 为本地时间
      const createdAt = new Date(circleObject.createdAt);
      const year = createdAt.getFullYear();
      const month = String(createdAt.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要+1
      const day = String(createdAt.getDate()).padStart(2, '0');
      const hours = String(createdAt.getHours()).padStart(2, '0');
      const minutes = String(createdAt.getMinutes()).padStart(2, '0');
      const seconds = String(createdAt.getSeconds()).padStart(2, '0');

      const formattedCreatedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      return {
        ...circleObject,
        memberCount: circle.members.length, // 添加成员数量字段
        createdAt: formattedCreatedAt // 使用格式化后的时间
      };
    });

    res.json({
      status: 'success',
      message:'获取圈子成功!',
      circles: circlesWithMemberCount // 使用处理后的数据
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    });
  }
});

/**
 * @api {get} /circles/search 搜索圈子
 * @apiName SearchCircles
 * @apiGroup Circle
 * @apiParam {String} keyword 搜索关键词
 * @apiParam {Number} [page=1] 当前页码
 * @apiParam {Number} [limit=10] 每页数量
 */
circleRouter.get('/search', async (req, res) => {
  try {
    const { keyword, sortType = 'postCount' } = req.query; // 添加 sortType 参数，默认值为 'postCount'
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!keyword) {
      return res.status(400).json({
        status: 'error',
        message: '请输入搜索关键词'
      });
    }

    // 构建分页和排序选项
    const options = {
      page,
      limit: Math.min(limit, 50),
      select: 'name avatar description postCount createdAt members', // 包括 members 字段
      sort: {}, // 动态设置排序
      populate: {
        path: 'creator',
        select: 'username avatar'
      }
    };

    // 根据 sortType 设置排序规则
    if (sortType === 'postCount') {
      options.sort = { postCount: -1 }; // 按热度（帖子数量）降序
    } else if (sortType === 'createdAt') {
      options.sort = { createdAt: -1 }; // 按时间降序
    } else {
      return res.status(400).json({
        status: 'error',
        message: '无效的排序类型'
      });
    }

    // 构建搜索条件（支持名称和描述模糊搜索）
    const query = {
      $or: [
        { name: new RegExp(keyword, 'i') },
        { description: new RegExp(keyword, 'i') }
      ]
    };

    const result = await circleModel.paginate(query, options);

    // 在返回结果中添加成员数量字段并排除 members 列表
    const circlesWithMemberCount = result.docs.map(circle => {
      const circleObject = circle.toObject();
      delete circleObject.members; // 删除 members 字段

      // 格式化 createdAt 为本地时间
      const createdAt = new Date(circleObject.createdAt);
      const year = createdAt.getFullYear();
      const month = String(createdAt.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要+1
      const day = String(createdAt.getDate()).padStart(2, '0');
      const hours = String(createdAt.getHours()).padStart(2, '0');
      const minutes = String(createdAt.getMinutes()).padStart(2, '0');
      const seconds = String(createdAt.getSeconds()).padStart(2, '0');

      const formattedCreatedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      circleObject.avatar = CURRENT_URL + circleObject.avatar;
      circleObject.creator.avatar = CURRENT_URL + circleObject.creator.avatar
      return {
        ...circleObject,
        memberCount: circle.members.length, // 添加成员数量字段
        createdAt: formattedCreatedAt // 使用格式化后的时间
      };
    });

    res.json({
      status: 'success',
      message: '搜索圈子成功!',
      searchCircles: circlesWithMemberCount // 使用处理后的数据
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '服务器错误!'
    });
  }
});
circleRouter.get('/hot-search', async (req, res) => {
    try {
        // 请求微博的热搜接口
        const response = await fetch('https://weibo.com/ajax/side/hotSearch');
        const result = await response.json();

        // 提取所需的字段
        const processedData = result.data.realtime.map(item => ({
            label_name: item.label_name,
            icon: item.icon,
            word: item.word,
            num: item.num,
            rank: item.rank,
        }));

        // 返回处理后的数据
        res.status(200).json({
            status: 'success',
            message: '获取实时热搜成功',
            searchs: processedData,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: '获取实时热搜失败',
        });
    }
});
module.exports = circleRouter;