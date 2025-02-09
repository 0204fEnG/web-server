// user.js
const express = require('express');
const userRouter = express.Router();

// 获取用户列表
userRouter.get('/', (req, res) => {
  res.send('User List');
});

// 根据 ID 获取用户
userRouter.get('/:id', (req, res) => {
  res.send(`User ID: ${req.params.id}`);
});

module.exports = userRouter;
