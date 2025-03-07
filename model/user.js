const mongoose = require('./index');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  roles: {
    type: [String],
    default: ['user']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'disabled'],
    default: 'inactive'
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  preferences: {
    type: Schema.Types.Mixed,
    default: {}
  },
  phone: {
    type: String,
    default: ''
  },
  // 关注的圈子
  followedCircles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'circles' // 假设圈子模型名为 Circle
    }
  ],
  // 关注的人
  followedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users' // 关联到 User 模型
    }
  ],
  // 粉丝
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users' // 关联到 User 模型
    }
  ],
  // 发布的帖子
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'posts' // 假设帖子模型名为 Post
    }
  ],
  // 发布的短视频
  shortVideos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shorts' // 假设短视频模型名为 ShortVideo
    }
  ],
  // 收藏的帖子
  favoritePosts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'posts' // 关联到 Post 模型
    }
  ],
  // 收藏的短视频
  favoriteShortVideos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'shorts' // 关联到 ShortVideo 模型
    }
  ]
}, {
  timestamps: true
});

const userModel = mongoose.model("users", userSchema);
module.exports = userModel;