const mongoose = require('./index');
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2'); // 引入插件
const circleSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    avatar: {
        type: String // 圈子头像 URL
    },
    description: {
        type: String // 圈子描述
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users' // 圈子成员列表
    }],
    postCount: {
        type: Number,
        default: 0 // 圈子帖子数，默认为 0
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users', // 圈子创建者
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now // 圈子创建时间
    }
}, {
    // 启用文档版本控制（_v 字段）
    versionKey: false,
    // 自动更新 `updatedAt` 字段
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// 创建 Circle 模型
circleSchema.plugin(mongoosePaginate);
const circleModel = mongoose.model('circles', circleSchema);

module.exports = circleModel;