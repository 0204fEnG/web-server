const mongoose = require('./index');
const Schema = mongoose.Schema;

// 短视频 Short 模型
const shortSchema = new Schema({
  title: {
    type: String,
    required: true
    },
  videoUrl: { // 视频资源 URL（必填）
    type: String,
    required: true
  },
  publishedAt: { // 视频发布时间
    type: Date,
    default: Date.now
  },
  description: { // 视频介绍
    type: String,
    default: ''
  },
  userId: { // 发布视频的用户 ID（关联 User 模型）
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: { // 点赞数
    type: Number,
    default: 0
  },
  comments: { // 评论数
    type: Number,
    default: 0
  },
  favorites: { // 收藏数
    type: Number,
    default: 0
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt 字段
});

// 创建模型
const shortModel = mongoose.model('shorts', shortSchema);

module.exports = shortModel;