// routes/reply.js
const express = require('express');
const replyRouter = express.Router();
const replyModel = require('../model/reply');
const postModel = require('../model/post')
const authMiddleware=require('../middleware/authMiddleware')
const {
  validatePostId,
  validateParentReply,
  validateReplyToUser
} = require('../middleware/commentValidators');
require("dotenv").config();
const CURRENT_URL = process.env.CURRENT_URL
replyRouter.get('/', async (req, res) => {
  try {
    const { postId, parentReply, page = 1, limit = 10, sort } = req.query;

    // 参数验证
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    
    const query = {
      post: postId,
      parentReply: parentReply || null
    };

    // 构建排序规则
    let sortCriteria = { createdAt: 1 };
    if (sort === 'likes') {
      sortCriteria = { likes: -1 };
    } else if (sort === 'time') {
      sortCriteria = { createdAt: -1 };
    }

    const [replies, total] = await Promise.all([
      replyModel.find(query)
        .populate('user', 'username avatar')
        .populate('replyToUser', 'username')
        .sort(sortCriteria)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(), // 转换为普通JS对象
      replyModel.countDocuments(query)
    ]);

    // 格式化时间和路径
    const formattedReplies = replies.map(reply => {
        // 转换时间格式
      const localDate = new Date(reply.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
        // 处理用户头像路径
       
      if (reply.user.avatar&&!reply.user.avatar.startsWith('http')) {
        reply.user.avatar = CURRENT_URL + reply.user.avatar;
      }
      // 处理被回复用户的头像路径（如果存在）
      if (reply.replyToUser?.avatar&&!reply.replyToUser.avatar.startsWith('http')) {
        reply.replyToUser.avatar = CURRENT_URL + reply.replyToUser.avatar;
      }

      return {
        ...reply,
        createdAt: localDate,
      };
    });

    res.status(200).json({
      status: 'success',
      message: '评论获取成功',
      comments: formattedReplies,
      hasMore: (pageNumber * limitNumber) < total,
      total: total
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error',
      message: err.message || '服务器内部错误'
    });
  }
});

// routes/reply.js
replyRouter.post('/',
  authMiddleware,
  validatePostId,      // 第一步：验证帖子
  validateParentReply, // 第二步：验证父级评论
  validateReplyToUser, // 第三步：验证被回复用户
  async (req, res) => {
    try {
      const { postId, content, parentReplyId, replyToUserId } = req.body;
      
      // 数据校验
      if (!content || !postId) {
        return res.status(400).json({ 
          status: 'error', 
          message: '缺少必要参数' 
        });
      }
      // 创建评论
      const newReply = new replyModel({
        post: postId,
        parentReply: parentReplyId || null,
        content,
        user: req.user.id, // 假设已通过认证中间件获取用户
        replyToUser: replyToUserId || null
      });

      await newReply.save();

      // 更新帖子回复数
      await postModel.findByIdAndUpdate(postId, { $inc: { replies: 1 } });

      // 返回完整评论数据
      const populatedReply = await replyModel.findById(newReply._id)
        .populate('user', 'username avatar')
        .populate('replyToUser', 'username')
        .lean(); // 转换为普通JS对象

        // 格式化时间和路径
      // 转换时间格式
      const localDate = new Date(populatedReply.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
      // 处理用户头像路径
      if (populatedReply.user.avatar&&!populatedReply.user.avatar.startsWith('http')) {
        populatedReply.user.avatar = CURRENT_URL + populatedReply.user.avatar;
      }

      // 处理被回复用户的头像路径（如果存在）
      if (populatedReply.replyToUser?.avatar&&!populatedReply.replyToUser.avatar.startsWith('http')) {
        populatedReply.replyToUser.avatar = CURRENT_URL + populatedReply.replyToUser.avatar;
      }

      res.status(201).json({
        status: 'success',
        message: '评论发布成功',
        comments: [{
          ...populatedReply,
          createdAt: localDate,
        }],
        hasMore: false,
        total: 1
      });
    } catch (err) {
      res.status(500).json({ 
        status: 'error', 
        message: err.message || '服务器内部错误' 
      });
    }
  }
);
module.exports = replyRouter;