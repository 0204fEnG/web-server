const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const validator = require("validator");
const isEmpty = require("lodash/isEmpty");
const authMiddleware = require("../middleware/authMiddleware"); // 认证中间件

require("dotenv").config();

const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "my_secret_key";

// 用户注册数据验证
const registerValidator = (data) => {
  const errors = {};

  if (validator.isEmpty(data.username || "")) {
    errors.username = "用户名不能为空";
  }

  if (!validator.isEmail(data.email || "")) {
    errors.email = "邮箱格式不正确";
  }

  if (validator.isEmpty(data.password || "")) {
    errors.password = "密码不能为空";
  } else if (data.password.length < 12) {
    errors.password = "密码长度必须至少 12 位";
  } else if (!/[A-Z]/.test(data.password)) {
    errors.password = "密码必须包含至少一个大写字母";
  } else if (!/[a-z]/.test(data.password)) {
    errors.password = "密码必须包含至少一个小写字母";
  }

  if (!validator.equals(data.password, data.confirmPassword || "")) {
    errors.confirmPassword = "两次输入的密码不相等";
  }

  return { isValid: isEmpty(errors), errors };
};

// 用户注册接口
// 用户注册接口
authRouter.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const { isValid, errors } = registerValidator(req.body);

    // 输入验证失败
    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "输入验证失败"
      });
    }

    // 检查用户名或邮箱是否已被注册
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "用户名或邮箱已被注册"
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    // 创建新用户
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      roles: ["user"], // 默认角色
      status: "active",
      avatar: "",
      bio: "",
      preferences: {},
      phone: "",
    });
    await newUser.save(); // 保存到数据库
    // 返回响应
    res.status(201).json({
      status: "success",
      message: "注册成功！请重新登录"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "服务器错误，请稍后再试"
    });
  }
});

// 登录
authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 输入验证
    if (validator.isEmpty(username || "") || validator.isEmpty(password || "")) {
      return res.status(400).json({
        status: "error",
        message:"用户名和密码不能为空" 
      });
    }

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "用户不存在"
      });
    }
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "密码错误",
      });
    }

    // 生成 JWT 令牌
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 返回响应
    res.status(200).json({
      status: "success",
      message: "登录成功！",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "服务器错误，请稍后再试",
    });
  }
});

//自动登录接口
authRouter.get("/auto-login", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // 不返回密码
    if (!user) {
      return res.status(404).json({ status: "error", message: "用户不存在" });
    }
    res.status(200).json({ status: "success", user });
  } catch (error) {
    res.status(500).json({ status: "error", message: "服务器错误，请稍后再试" });
  }
});
module.exports = authRouter;