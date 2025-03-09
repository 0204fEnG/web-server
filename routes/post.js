// routes/post.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../model/post');
const Circle = require('../model/circle');
const authMiddleware = require('../middleware/authMiddleware');
const createUploadMiddleware = require('../utils/upload');
const path = require('path');

// 动态路径：根据需要设置上传目录
const uploadDir = path.join(__dirname, '../public/uploads/post');
const uploadMiddleware = createUploadMiddleware(uploadDir, 'image', 9); // 支持最多上传9张图片

// router.post(
//   '/',
//   authMiddleware,
//   uploadMiddleware, // 使用通用上传中间件
//   async (req, res) => {
//     try {
//       // 从请求体中获取字段
//       const { title, content, circleId } = req.body;
//       const authorId = req.user.id;
//       // 验证必要字段
//       if (!title || !content || !circleId) {
//         return res.status(400).json({ message: '缺少标题、内容或圈子ID' });
//       }

//       // 验证 circleId 和 authorId 是否为有效的 ObjectId
//       if (!mongoose.Types.ObjectId.isValid(circleId)) {
//         return res.status(400).json({ message: '圈子ID格式无效' });
//       }
//       if (!mongoose.Types.ObjectId.isValid(authorId)) {
//         return res.status(400).json({ message: '用户ID格式无效' });
//       }

//       // 转换ID为ObjectId
//       const authorObjectId = new mongoose.Types.ObjectId(authorId);
//       const circleObjectId = new mongoose.Types.ObjectId(circleId);

//       // 检查圈子是否存在
//       const circle = await Circle.findById(circleObjectId);
//       if (!circle) {
//         return res.status(404).json({ message: '圈子不存在' });
//       }

//       // 检查用户是否为圈子成员
//       const isMember = circle.members.some(memberId =>
//         memberId.equals(authorObjectId)
//       );
//       if (!isMember) {
//         return res.status(403).json({ message: '您不是该圈子成员，无法发帖' });
//       }

//       // 处理上传的图片文件
//       const images = [];
//       if (req.files && req.files.length > 0) {
//         req.files.forEach(file => {
//           images.push(`/uploads/posts/${file.filename}`);
//         });
//       }

//       // 创建新帖子
//       const newPost = await Post.create({
//         title,
//         content,
//         images,
//         authorId: authorObjectId,
//         circleId: circleObjectId,
//       });

//       // 原子操作递增帖子计数
//       await Circle.updateOne(
//         { _id: circleObjectId },
//         { $inc: { postCount: 1 } }
//       );

//       res.status(201).json(newPost);
//     } catch (error) {
//       console.error('发布帖子失败:', error);
//       res.status(500).json({ message: '服务器内部错误' });
//     }
//   }
// );

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
        authorId: authorObjectId,
        circleId: circleObjectId,
      });

      // 原子操作递增帖子计数
      await Circle.updateOne(
        { _id: circleObjectId },
        { $inc: { postCount: 1 } }
      );

      res.status(201).json(newPost);
    } catch (error) {
      console.error('发布帖子失败:', error);
      res.status(500).json({ message: '服务器内部错误' });
    }
  }
);

/**
 * 获取帖子列表（分页）
 * 按评论数从高到低排序，发布时间从早到晚排序
 */
/**
 * 获取帖子列表（分页）
 * 按评论数从高到低排序，发布时间从早到晚排序
 */


// router.get('/', async (req, res) => {
//   try {
//     // 从查询参数中获取分页信息
//     const page = parseInt(req.query.page) || 1; // 当前页码，默认为1
//     const limit = parseInt(req.query.limit) || 10; // 每页条数，默认为10

//     // 计算跳过的文档数量
//     const skip = (page - 1) * limit;

//     // 查询帖子列表
//     const posts = await Post.find({})
//       .sort({ replies: -1, createdAt: 1 }) // 按评论数降序，发布时间升序
//       .skip(skip) // 跳过前面的文档
//       .limit(limit) // 限制返回的文档数量
//       .populate('authorId', 'username avatar') // 关联用户信息
//       .populate('circleId', 'name') // 关联圈子信息
//       .select('-__v'); // 排除 __v 字段

//     // 转换创建时间为本地时间格式
//     const formattedPosts = posts.map(post => {
//       const localDate = new Date(post.createdAt).toLocaleString('zh-CN', {
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit',
//         hour12: false // 使用24小时制
//       }).replace(/\//g, '-'); // 将斜杠替换为短横线

//       return {
//         ...post.toObject(), // 将 Mongoose 文档转换为普通对象
//         createdAt: localDate // 覆盖 createdAt 字段
//       };
//     });

//     // 返回结果
//     res.status(200).json({
//       success: true,
//       data: formattedPosts // 返回格式化后的帖子数据
//     });
//   } catch (error) {
//     console.error('获取帖子列表失败:', error);
//     res.status(500).json({ success: false, message: '服务器内部错误' });
//   }
// });



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
      .populate('authorId', 'username avatar') // 关联用户信息
      .populate('circleId', 'name avatar') // 关联圈子信息，添加 avatar 字段
      .select('-__v'); // 排除 __v 字段

    // 获取当前服务器的 IP 地址和端口号
    const host = req.get('host'); // 例如 "localhost:3000"
    const protocol = req.protocol; // 例如 "http" 或 "https"

    // 转换创建时间为本地时间格式，并调整字段名称和路径
    const formattedPosts = posts.map(post => {
      const localDate = new Date(post.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 使用24小时制
      }).replace(/\//g, '-'); // 将斜杠替换为短横线

      // 将相对路径转换为完整路径
      const authorAvatar = post.authorId.avatar
        ? `${protocol}://${host}/public${post.authorId.avatar}`
        : null;
      const circleAvatar = post.circleId.avatar
        ? `${protocol}://${host}/public${post.circleId.avatar}`
        : null;

      return {
        ...post.toObject(), // 将 Mongoose 文档转换为普通对象
        createdAt: localDate, // 覆盖 createdAt 字段
        author: {
          _id: post.authorId._id,
          username: post.authorId.username,
          avatar: authorAvatar, // 使用完整路径
        },
        circle: {
          _id: post.circleId._id,
          name: post.circleId.name,
          avatar: circleAvatar, // 使用完整路径
        },
      };
    });

    // 返回结果
    res.status(200).json({
      success: true,
      data: formattedPosts, // 返回格式化后的帖子数据
    });
  } catch (error) {
    console.error('获取帖子列表失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;





