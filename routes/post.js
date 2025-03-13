// routes/post.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../model/post');
const Circle = require('../model/circle');
const authMiddleware = require('../middleware/authMiddleware');
const createUploadMiddleware = require('../utils/upload');
require("dotenv").config();
const path = require('path');
const CURRENT_URL = process.env.CURRENT_URL
// 动态路径：根据需要设置上传目录
const uploadDir = path.join(__dirname, '../public/uploads/post');
const uploadMiddleware = createUploadMiddleware(uploadDir, 'image', 9); // 支持最多上传9张图片


router.post(
  '/',
  authMiddleware,
  uploadMiddleware, // 使用通用上传中间件
  async (req, res) => {
    try {
      // 从请求体中获取字段
      const { title, content, circleId, tags } = req.body;
      const authorId = req.user.id;

      // 验证必要字段
      if (!title || !content || !circleId) {
        return res.status(400).json({ message: '缺少标题、内容或圈子ID' });
      }

      // 验证 circleId 和 authorId 是否为有效的 ObjectId
      if (!mongoose.Types.ObjectId.isValid(circleId)) {
        return res.status(400).json({ message: '圈子ID格式无效' });
      }
      if (!mongoose.Types.ObjectId.isValid(authorId)) {
        return res.status(400).json({ message: '用户ID格式无效' });
      }

      // 转换ID为ObjectId
      const authorObjectId = new mongoose.Types.ObjectId(authorId);
      const circleObjectId = new mongoose.Types.ObjectId(circleId);

      // 检查圈子是否存在
      const circle = await Circle.findById(circleObjectId);
      if (!circle) {
        return res.status(404).json({ message: '圈子不存在' });
      }

      // 检查用户是否为圈子成员
      const isMember = circle.members.some(memberId =>
        memberId.equals(authorObjectId)
      );
      if (!isMember) {
        return res.status(403).json({ message: '您不是该圈子成员，无法发帖' });
      }

      // 处理上传的图片文件
      const images = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          images.push(`/uploads/posts/${file.filename}`);
        });
      }

      // 解析标签数据
      let parsedTags = [];
      try {
        parsedTags = JSON.parse(tags || '[]'); // 将字符串解析为数组
      } catch (error) {
        console.error('解析标签失败:', error);
        return res.status(400).json({ message: '标签数据格式错误' });
      }

      // 创建新帖子
      const newPost = await Post.create({
        title,
        content,
        images,
        tags: parsedTags, // 保存标签
        author: authorObjectId,
        circle: circleObjectId,
      });

      // 原子操作递增帖子计数
      await Circle.updateOne(
        { _id: circleObjectId },
        { $inc: { postCount: 1 } }
      );

      res.status(201).json({
        status: 'success',
        message: '帖子发布成功',
        post:newPost
      });
    } catch (error) {
      res.status(500).json({
       status:'error',
        message: '服务器内部错误'
      });
    }
  }
);



router.get('/', async (req, res) => {
  try {
    // 从查询参数中获取分页信息
    const page = parseInt(req.query.page) || 1; // 当前页码，默认为1
    const limit = parseInt(req.query.limit) || 10; // 每页条数，默认为10

    // 从查询参数中获取排序信息
    const sortBy = req.query.sortBy || 'replies'; // 排序字段，默认为 replies
    const sortOrder = parseInt(req.query.sortOrder) || -1; // 排序顺序，默认为降序

    // 验证排序字段和顺序
    const validSortFields = ['replies', 'createdAt'];
    const validSortOrders = [1, -1];

    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ success: false, message: '无效的排序字段' });
    }
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({ success: false, message: '无效的排序顺序' });
    }

    // 计算跳过的文档数量
    const skip = (page - 1) * limit;

    // 动态排序规则
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    // 查询帖子列表
    const posts = await Post.find({})
      .sort(sortOptions) // 动态排序
      .skip(skip) // 跳过前面的文档
      .limit(limit) // 限制返回的文档数量
      .populate('author', 'username avatar') // 关联用户信息
      .populate('circle', 'name avatar') // 关联圈子信息，添加 avatar 字段
      .select('-__v'); // 排除 __v 字段


    // 转换创建时间为本地时间格式，并调整字段名称和路径
    const formattedPosts = posts.map(post => {
      post=post.toObject()
      const localDate = new Date(post.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 使用24小时制
      }).replace(/\//g, '-'); // 将斜杠替换为短横线
      // 拼接图片路径
      if (post.images) {
        post.images = post.images.map(image => CURRENT_URL + image);
      }
      // 拼接用户头像和圈子头像路径
      post.author.avatar = CURRENT_URL + post.author.avatar;
      post.circle.avatar = CURRENT_URL + post.circle.avatar;
      return {
        ...post,// 将 Mongoose 文档转换为普通对象
        createdAt: localDate, // 覆盖 createdAt 字段
      };
    });

    // 返回结果
    res.status(200).json({
      status: 'success',
      message:'帖子列表获取成功',
      posts: formattedPosts, // 返回格式化后的帖子数据
    });
  } catch (error) {
    res.status(500).json({ status:'error', message: '服务器内部错误' });
  }
});

router.get('/search', async (req, res) => {
  try {
    // 从查询参数中获取分页信息
    const page = parseInt(req.query.page) || 1; // 当前页码，默认为1
    const limit = parseInt(req.query.limit) || 10; // 每页条数，默认为10

    // 从查询参数中获取排序信息
    const sortBy = req.query.sortBy || 'replies'; // 排序字段，默认为 replies
    const sortOrder = parseInt(req.query.sortOrder) || -1; // 排序顺序，默认为降序

    // 验证排序字段和顺序
    const validSortFields = ['replies', 'createdAt'];
    const validSortOrders = [1, -1];

    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ success: false, message: '无效的排序字段' });
    }
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({ success: false, message: '无效的排序顺序' });
    }

    // 从查询参数中获取搜索关键词
    const keyword = req.query.keyword || '';

    // 计算跳过的文档数量
    const skip = (page - 1) * limit;

    // 动态排序规则
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    // 构建查询条件
    const queryConditions = {
      $or: [
        { title: { $regex: keyword, $options: 'i' } }, // 标题中包含关键词
        { content: { $regex: keyword, $options: 'i' } }, // 内容中包含关键词
        { 'tags.name': { $regex: keyword, $options: 'i' } } // 标签中包含关键词
      ]
    };

    // 查询帖子列表
    const posts = await Post.find(queryConditions)
      .sort(sortOptions) // 动态排序
      .skip(skip) // 跳过前面的文档
      .limit(limit) // 限制返回的文档数量
      .populate('author', 'username avatar') // 关联用户信息
      .populate('circle', 'name avatar') // 关联圈子信息，添加 avatar 字段
      .select('-__v'); // 排除 __v 字段

    // 转换创建时间为本地时间格式，并调整字段名称和路径
    const formattedPosts = posts.map(post => {
      post = post.toObject();
      const localDate = new Date(post.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 使用24小时制
      }).replace(/\//g, '-'); // 将斜杠替换为短横线

      // 拼接图片路径
      if (post.images) {
        post.images = post.images.map(image => CURRENT_URL + image);
      }

      // 拼接用户头像和圈子头像路径
      post.author.avatar = CURRENT_URL + post.author.avatar;
      post.circle.avatar = CURRENT_URL + post.circle.avatar;

      return {
        ...post, // 将 Mongoose 文档转换为普通对象
        createdAt: localDate, // 覆盖 createdAt 字段
      };
    });

    // 返回结果
    res.status(200).json({
      status: 'success',
      message: '帖子列表获取成功',
      searchPosts: formattedPosts, // 返回格式化后的帖子数据
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
});


// 查询特定 postId 的帖子
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // 验证 postId 是否为有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: '无效的帖子 ID' });
    }

    // 查询帖子数据
    const post = await Post.findById(postId)
      .populate('author', 'username avatar') // 关联用户信息
      .populate('circle', 'name avatar') // 关联圈子信息
      .select('-__v') // 排除 __v 字段
      .lean(); // 返回普通对象

    // 如果未找到帖子
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子未找到' });
    }

    // 处理图片路径
    if (Array.isArray(post.images)) {
      post.images = post.images.map(image => `${CURRENT_URL}${image}`);
    }

    // 处理用户头像和圈子头像路径
    if (post.author?.avatar) {
      post.author.avatar = `${CURRENT_URL}${post.author.avatar}`;
    }
    if (post.circle?.avatar) {
      post.circle.avatar = `${CURRENT_URL}${post.circle.avatar}`;
    }

    // 转换创建时间为本地时间格式
    const localDate = new Date(post.createdAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-');

    // 返回结果
    res.status(200).json({
      status: 'success',
      message: '帖子数据获取成功',
      post: {
        ...post,
        createdAt: localDate
      }
    });
  } catch (error) {
    console.error('查询帖子失败:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
});
module.exports = router;





