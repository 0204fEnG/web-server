const express = require('express');
const bodyParser = require('body-parser'); // 用于解析请求体
const app = express(); // 创建 Express 应用实例
const userRouter = require('./routes/user')
const authRouter = require('./routes/auth')
const cors=require('cors')
require("dotenv").config();
// 中间件配置
app.use(cors())
app.use(bodyParser.json()); // 用于解析 application/json
app.use(bodyParser.urlencoded({ extended: true })); // 用于解析 application/x-www-form-urlencoded
app.use('/api/auth',authRouter)
// // 路由配置
// app.use('/api/home', require('./routes/home'));
// app.use('/api/short', require('./routes/circles'));
// app.use('/api/circle', require('./routes/shorts'));
app.use('/api/user',userRouter );

// // 错误处理中间件
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broke!');
// });

// 设置监听端口
const PORT=process.env.PORT||3200
app.listen(PORT, () => {
  console.log(`服务器运行在${PORT}端口`);
});

module.exports = app;
