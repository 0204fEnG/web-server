const mongoose = require('./index');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    images: [{
        type: String // 图片 URL
    }],
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users', // 关联到用户模型
        required: true
    },
    circleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'circles', // 关联到圈子模型
        required: true
    },
    tags: [{
        name: {
            type: String, // 标签名称
            required: true
        },
        index: {
            type: Number, // 标签在正文中的位置
            required: true
        }
    }],
    likes: {
        type: Number,
        default: 0
    },
    replies: {
        type: Number,
        default: 0
    },
    favorites: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const postModel = mongoose.model('posts', postSchema);

module.exports = postModel;
