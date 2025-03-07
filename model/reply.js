const mongoose = require('./index');
const Schema = mongoose.Schema;

// 定义回复的 Schema
const replySchema = new Schema({
    // 关联的帖子 ID
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'posts', // 关联到 Post 模型
        required: true
    },
    // 父级回复 ID，用于嵌套回复
    parentReplyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'replys', // 关联到 Reply 模型
        default: null // 主回复的 parentReplyId 为 null
    },
    // 回复内容
    content: {
        type: String,
        required: true,
        trim: true // 自动去除字符串首尾的空格
    },
    // 回复者用户名
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users', // 假设用户信息存储在 users 集合中，关联到 User 模型
        required: true
    },
    // 被回复的用户名（仅当回复子回复时存在）
    replyToUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users', // 同样关联到 User 模型
        default: null
    },
    // 回复创建时间
    createdAt: {
        type: Date,
        default: Date.now // 默认为当前时间
    },
    // 点赞数
    likes: {
        type: Number,
        default: 0 // 默认点赞数为 0
    }
}
);

// 创建 Reply 模型
const replyModel = mongoose.model('replys', replySchema);

module.exports = replyModel;