// user.js
const express = require('express');
const userRouter = express.Router();
const userModel = require('../model/user');
const CURRENT_URL = process.env.CURRENT_URL
// 获取用户列表
userRouter.get('/', (req, res) => {
  
});

// routes/user.js
userRouter.get('/search', async (req, res) => {
  try {
    const { keyword, sortType = 'fans' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 参数验证
    const validSortTypes = ['fans', 'createdAt'];
    if (!validSortTypes.includes(sortType)) {
      return res.status(400).json({ status: 'error', message: '无效的排序类型' });
    }

    const sortOptions = {};
    if (sortType === 'fans') {
      sortOptions.followersCount = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const aggregation = [
      {
        $match: {
          $or: [
            { username: { $regex: keyword, $options: 'i' } },
            { bio: { $regex: keyword, $options: 'i' } }
          ]
        }
      },
      {
        $addFields: {
          followersCount: { $size: "$followers" }
        }
      },
      {
        $sort: sortOptions
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      },
      {
        $project: {
          password: 0,
          followedCircles: 0,
          followedUsers: 0,
          followers: 0,
          shortVideos: 0,
          favoritePosts: 0,
          favoriteShortVideos: 0,
          __v: 0
        }
      }
    ];

    const [users, total] = await Promise.all([
      userModel.aggregate(aggregation),
      userModel.countDocuments({
        $or: [
          { username: { $regex: keyword, $options: 'i' } },
          { bio: { $regex: keyword, $options: 'i' } }
        ]
      })
    ]);

    // 格式化日期
    const formattedUsers = users.map(user => ({
      ...user,
      avatar:CURRENT_URL+user.avatar,
      createdAt: new Date(user.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-'),
      postsCount: user.posts?.length || 0,
      followersCount: user.followersCount
    }));

    res.status(200).json({
      status: 'success',
      message: '搜索用户成功',
      searchUsers: formattedUsers,
      hasMore: (page * limit) < total
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
});

// 根据 ID 获取用户
userRouter.get('/:id', (req, res) => {
  res.send(`User ID: ${req.params.id}`);
});

module.exports = userRouter;
