const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../model/user"); // 确保路径正确
const validator = require("validator");
const isEmpty = require("lodash/isEmpty");

const authRouter = express.Router();

// **环境变量**
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET || "my_secret_key"; // 确保在 .env 文件中定义

// **用户注册数据验证**
const registerValidator = (data) => {
  const errors = {};

  if (validator.isEmpty(data.username)) {
    errors.username = "用户名不能为空";
  }

  if (!validator.isEmail(data.email)) {
    errors.email = "邮箱格式不正确";
  }

  if (validator.isEmpty(data.password)) {
    errors.password = "密码不能为空";
  } else if (data.password.length < 12) {
    errors.password = "密码长度必须至少 12 位";
  } else if (!/[A-Z]/.test(data.password)) {
    errors.password = "密码必须包含至少一个大写字母";
  } else if (!/[a-z]/.test(data.password)) {
    errors.password = "密码必须包含至少一个小写字母";
  }

  if (!validator.equals(data.password, data.confirmPassword)) {
    errors.confirmPassword = "两次输入的密码不相等";
  }

  return {
    isValid: isEmpty(errors),
    errors,
  };
};

// **用户注册接口**
authRouter.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const { isValid, errors } = registerValidator(req.body);

    // 1. **输入验证失败**
    if (!isValid) {
      return res.status(400).json({ errors });
    }

    // 2. **检查用户名是否已存在**
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        errors: { msg: "用户名或邮箱已被注册" },
      });
    }

    // 3. **创建新用户**
    const newUser = new User({
      username,
      email,
      password, 
      roles: ["user"],  // 默认角色
      status: "inactive",
      avatar: "",
      bio: "",
      preferences: {}, 
      phone: ""
    });

    await newUser.save(); // **保存到数据库**

    // 4. **生成 JWT 令牌**
    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // 5. **返回响应**
    res.status(201).json({
      msg: "注册成功！",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
      token,
    });
  } catch (error) {
    console.error("注册失败:", error);
    res.status(500).json({ msg: "服务器错误，请稍后再试" });
  }
});

module.exports = authRouter;