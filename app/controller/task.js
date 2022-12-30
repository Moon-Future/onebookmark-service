'use strict'
const Controller = require('egg').Controller
const { getWebSiteInfo, checkToken, cosUpload } = require('../utils/index')
const { privateKey, tokenConfig } = require('../../config/secret')

class TaskController extends Controller {
  // 网站图标任务
  async webIconTask() {
    const { ctx, app } = this
    const userInfo = checkToken(ctx)
    if (!userInfo || userInfo.email !== '236338364@qq.com') return
    ctx.body = { status: 1 }
    try {
      const bookmarks = await app.mysql.select('bookmark', {
        where: { delete_status: 0, icon_status: 0, folder_status: 0 }
      })
      const iconRes = await app.mysql.select('web_icon')
      const iconMap = {}
      iconRes.forEach(item => {
        iconMap[item.web_url] = item.icon_url
      })

      for (let i = 0, len = bookmarks.length; i < len; i++) {
        const bookmarkItem = bookmarks[i]
        const { id, web_url, web_host, icon_url } = bookmarkItem
        if (web_url.includes('localhost:') || !icon_url) continue
        let iconUrl = iconMap[web_host]
        if (iconUrl) {
          await app.mysql.update('bookmark', { id, icon_status: 1, icon_url: iconUrl })
        } else {
          // 爬取网站
          // const infoRes = await getWebSiteInfo(web_url)
          // if (infoRes.iconUrl) {
          //   iconUrl = infoRes.iconUrl
          // }
          // 上传图片
          const uploadRes = await cosUpload({
            fileName: `onebookmark/webicon/${web_host.replace(/\./g, '')}.jpg`,
            dataBuffer: Buffer.from(icon_url.split(',')[1], "base64")
          })
          iconUrl = '//' + uploadRes.Location
          await app.mysql.update('bookmark', { id, icon_status: 1, icon_url: iconUrl })
          await app.mysql.insert('web_icon', { web_url: web_host, icon_url: iconUrl })
          iconMap[web_host] = iconUrl
        }
      }
    } catch (e) {
      console.log(e)
      ctx.status = 500
      ctx.body = { message: '服务端出错' }
    }
  }
}

// 图标抓取工具,帮您快速的定位网页的favicon.ico图标网址,先分析当前网址shortcut标签,如果不存在,则访问网站首页,如果首页shortcut标签也不存在,则访问默认的根目录favicon.ico图标。

module.exports = TaskController
