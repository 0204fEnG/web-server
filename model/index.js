const mongoose = require("mongoose");
//数据库连接地址+数据库名称（system）
require("dotenv").config();
const DBURL=process.env.MONGO_URI
//连接数据库
 mongoose.connect(DBURL).then(res=>{
    console.log('连接成功')
 }).catch(e=>{
    console.log('连接失败')
 })
 
module.exports = mongoose;