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
  roles: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'disabled'],
    default: 'inactive'
  },
  avatar: {
    type: String
  },
  bio: {
    type: String
  },
  preferences: Schema.Types.Mixed,
  phone: {
    type: String
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

// // 添加一个方法来比较密码
// user.methods.comparePassword = function(candidatePassword, callback) {
//   bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
//     if (err) return callback(err);
//     callback(null, isMatch);
//   });
// };

const userModel = mongoose.model("users", user);
module.exports = userModel

