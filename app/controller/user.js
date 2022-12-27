'use strict'
const Controller = require('egg').Controller
const { createId } = require('../utils/index')
const { transporter, mailOptions } = require('../utils/email')

class UserController extends Controller {
  async sendCode() {
    const { ctx, app } = this
    const conn = await app.mysql.beginTransaction()
    try {
      const { email } = ctx.request.body
      const code = createId()
      
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
}

// 图标抓取工具,帮您快速的定位网页的favicon.ico图标网址,先分析当前网址shortcut标签,如果不存在,则访问网站首页,如果首页shortcut标签也不存在,则访问默认的根目录favicon.ico图标。

module.exports = UserController
