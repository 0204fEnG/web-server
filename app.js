const express = require('express');
const bodyParser = require('body-parser'); // 用于解析请求体
const app = express(); // 创建 Express 应用实例
const userRouter=require('./routes/user')
// 中间件配置
app.use(bodyParser.json()); // 用于解析 application/json
app.use(bodyParser.urlencoded({ extended: true })); // 用于解析 application/x-www-form-urlencoded

// // 路由配置
// app.use('/api/home', require('./routes/home'));
// app.use('/api/videos', require('./routes/circles'));
// app.use('/api/circles', require('./routes/shorts'));
app.use('/users',userRouter );

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 设置监听端口
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
