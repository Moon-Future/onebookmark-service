'use strict'
const Controller = require('egg').Controller
const { randomCode, encryptByHmac } = require('../utils/index')
const { transporter, mailOptions } = require('../utils/email')
const { privateKey, tokenConfig } = require('../../config/secret')
const JSEncrypt = require('node-jsencrypt')
const jwt = require('jsonwebtoken')
const { del } = require('superagent')

const $JSEncrypt = new JSEncrypt()
$JSEncrypt.setPrivateKey(privateKey)

class UserController extends Controller {
  async sendCode() {
    const { ctx, app } = this
    const conn = await app.mysql.beginTransaction()
    try {
      const { email } = ctx.request.body
      const code = randomCode()
      await app.redis.set(`onebookmark:emailCode:${email}`, code, 'EX', 300) // 300 秒过期
      mailOptions.subject = `一个书签-验证码`
      mailOptions.to = email
      mailOptions.html = `
        <h1>欢迎注册一个书签</h1>
        <p>您的验证么是: <strong>${code}</strong></p>
        <p>请在 5 分钟内使用</p>
      `
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error)
        }
      })
      await conn.commit()
      ctx.body = { status: 1 }
    } catch (e) {
      await conn.rollback()
      console.log(e)
      ctx.status = 500
      ctx.body = { message: '服务端出错' }
    }
  }

  // 登录
  async login() {
    const { ctx, app } = this
    const conn = await app.mysql.beginTransaction()
    try {
      const { email, pwd } = ctx.request.body
      const dePwd = $JSEncrypt.decrypt(pwd)

      const res = await conn.get('user', {
        email,
        pwd: encryptByHmac(dePwd)
      })
      if (!res) {
        ctx.body = { status: 0, message: '用户不存在或密码错误' }
        return
      }
      const userInfo = { ...res }
      delete userInfo.pwd
      delete userInfo.delete_status
      delete userInfo.create_time
      delete userInfo.update_time
      delete userInfo.delete_status
      const token = jwt.sign(userInfo, tokenConfig.privateKey, {
        expiresIn: '7d'
      })
      // await app.redis.set(`onebookmark:session:${userInfo.id}`, JSON.stringify(userInfo), 'EX', 604800) // 7天过期
      await conn.commit()
      ctx.body = { status: 1, data: userInfo, token: token }
    } catch (e) {
      await conn.rollback()
      console.log(e)
      ctx.status = 500
      ctx.body = { message: '服务端出错' }
    }
  }

  // 注册
  async register() {
    const { ctx, app } = this
    const conn = await app.mysql.beginTransaction()
    try {
      const mailReg = /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
      const { email, code, pwd, cpwd } = ctx.request.body
      const res = await conn.get('user', { email })
      if (res) {
        ctx.body = { status: 0, message: '用户已存在' }
        return
      }

      if (!mailReg.test(email)) {
        ctx.body = { status: 0, message: '邮箱格式不正确' }
        return
      }

      const dePwd = $JSEncrypt.decrypt(pwd)
      const deCpwd = $JSEncrypt.decrypt(cpwd)
      if (dePwd !== deCpwd) {
        ctx.body = { status: 0, message: '两次输入密码不一致' }
        return
      }

      const redisCode = await app.redis.get(`onebookmark:emailCode:${email}`)
      if (code !== redisCode) {
        ctx.body = { status: 0, message: '验证码校验失败' }
        return
      }
      await app.redis.del(`onebookmark:emailCode:${email}`)

      await conn.insert('user', {
        email,
        pwd: encryptByHmac(dePwd)
      })
      await conn.commit()
      ctx.body = { status: 1, message: '注册成功' }
    } catch (e) {
      await conn.rollback()
      console.log(e)
      ctx.status = 500
      ctx.body = { message: '服务端出错' }
    }
  }

  async getUserInfo() {
    const { ctx, app } = this
    try {
      const { token } = ctx.request.body
      const userInfo = jwt.verify(token, tokenConfig.privateKey)
      ctx.body = { status: 1, data: userInfo }
    } catch (e) {
      console.log(e)
      ctx.status = 500
      ctx.body = { message: '服务端出错' }
    }
  }
}

// 图标抓取工具,帮您快速的定位网页的favicon.ico图标网址,先分析当前网址shortcut标签,如果不存在,则访问网站首页,如果首页shortcut标签也不存在,则访问默认的根目录favicon.ico图标。

module.exports = UserController
