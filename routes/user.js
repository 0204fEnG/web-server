// user.js
const express = require('express');
const router = express.Router();

// 获取用户列表
router.get('/', (req, res) => {
  res.send('User List');
});

// 根据 ID 获取用户
router.get('/:id', (req, res) => {
  res.send(`User ID: ${req.params.id}`);
});

module.exports = router;
