const express = require('express');
const postModel = require('../model/post'); // 引入帖子模型

const router = express.Router(); // 创建一个路由实例

// 发布帖子的接口
router.post('/', async (req, res) => {
    try {
        // 从请求体中提取帖子数据
        const { title, content, images, authorId, circleId } = req.body;

        // 验证必填字段
        if (!title || !content || !authorId || !circleId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 创建帖子实例
        const newPost = new postModel({
            title,
            content,
            images: images || [], // 如果没有图片，设置为空数组
            authorId,
            circleId
        });

        // 保存到数据库
        const savedPost = await newPost.save();

        // 返回成功响应
        res.status(201).json({
            message: 'Post created successfully',
            post: savedPost
        });
    } catch (error) {
        // 捕获错误并返回错误响应
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

module.exports = router; // 导出路由实例