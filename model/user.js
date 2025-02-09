const mongoose = require('./index');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const user = new Schema({
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
    default:['user']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'disabled'],
    default: 'inactive'
  },
  avatar: {
    type: String,
    default:''
  },
  bio: {
    type: String,
    default:''
  },
  preferences: {
    type:Schema.Types.Mixed,
    default:{}
  },
  phone: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});
// 使用中间件在保存用户之前加密密码
user.pre('save', async function(next) {
  if (this.isModified('password') || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

const userModel = mongoose.model("users", user);
module.exports = userModel

