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

const userModel = mongoose.model("users", userSchema);
module.exports = userModel

