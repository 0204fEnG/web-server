// middlewares/commentValidators.js
const { Types } = require('mongoose');
const postModel = require('../model/post');
const replyModel = require('../model/reply');
const userModel = require('../model/user');

// 验证帖子ID有效性
const validatePostId = async (req, res, next) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ code: 4001, message: '必须指定帖子ID' });
    }

    // 验证ID格式
    if (!Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ code: 4002, message: '无效的帖子ID格式' });
    }

    // 验证帖子存在性
    const postExists = await postModel.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ code: 4003, message: '指定的帖子不存在' });
    }

    // 将验证后的postId挂载到请求对象
    req.validatedPostId = postId;
    next();
  } catch (err) {
    res.status(500).json({ code: 5001, message: '帖子验证服务异常' });
  }
};

// 验证父级评论有效性
const validateParentReply = async (req, res, next) => {
  try {
    const { parentReplyId } = req.body;
    
    // 没有父级评论时跳过验证
    if (!parentReplyId) return next();

    // 格式验证
    if (!Types.ObjectId.isValid(parentReplyId)) {
      return res.status(400).json({ code: 4004, message: '无效的父级评论ID格式' });
    }

    // 获取父级评论
    const parentReply = await replyModel.findById(parentReplyId)
      .select('post')
      .lean();

    // 存在性验证
    if (!parentReply) {
      return res.status(404).json({ code: 4005, message: '父级评论不存在' });
    }

    // 归属验证（确保父级评论属于当前帖子）
    if (parentReply.post.toString() !== req.validatedPostId) {
      return res.status(409).json({ 
        code: 4006, 
        message: '父级评论不属于当前帖子' 
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ code: 5002, message: '父级评论验证服务异常' });
  }
};

// 验证被回复用户有效性
const validateReplyToUser = async (req, res, next) => {
  try {
    const { replyToUserId } = req.body;
    
    // 没有指定被回复用户时跳过
    if (!replyToUserId) return next();

    // 格式验证
    if (!Types.ObjectId.isValid(replyToUserId)) {
      return res.status(400).json({ code: 4007, message: '无效的用户ID格式' });
    }

    // 存在性验证
    const userExists = await userModel.exists({ _id: replyToUserId });
    if (!userExists) {
      return res.status(404).json({ code: 4008, message: '被回复用户不存在' });
    }

    next();
  } catch (err) {
    res.status(500).json({ code: 5003, message: '用户验证服务异常' });
  }
};

module.exports = {
  validatePostId,
  validateParentReply,
  validateReplyToUser
};