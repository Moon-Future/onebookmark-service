const jwt = require('jsonwebtoken')
const COS = require('cos-nodejs-sdk-v5')
const { tokenConfig, tencentCloud, hmacKey } = require('../../config/secret')
const cheerio = require('cheerio')
const charset = require('superagent-charset')
const superagent = charset(require('superagent'))
const path = require('path')
const crypto = require('crypto')

// 验证是否登陆
function checkToken(ctx) {
  const token = ctx.get('Authorization')
  if (token === '') {
    ctx.status = 403
    ctx.body = { message: '请先登陆' }
    return false
  }
  try {
    const userInfo = jwt.verify(token, tokenConfig.privateKey)
    return userInfo
  } catch (err) {
    ctx.status = 403
    ctx.body = { message: '请先登陆' }
    return false
  }
}

// 随机生成数字 ID
function randomCode(len = 6) {
  return Math.random().toString().slice(-len)
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 创建实例
const cos = new COS({
  SecretId: tencentCloud.SecretId,
  SecretKey: tencentCloud.SecretKey,
})

const cosUpload = function (fileName, filePath, bucketInfo) {
  // 分片上传
  return new Promise((resolve, reject) => {
    cos.sliceUploadFile(
      {
        Bucket: bucketInfo.bucket,
        Region: bucketInfo.region,
        Key: fileName,
        FilePath: filePath,
      },
      function (err, data) {
        // console.log('err', err)
        // console.log('data', data)
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      }
    )
  })
}

/**
 * 获取页面内容
 * @param {String} url 要爬取的页面地址
 * @return {Object} 类似 jQuery 对象
 */
const resolvePage = (url, encodeing = 'utf-8', opts = {}) => {
  return new Promise(function (resolve, reject) {
    if (encodeing !== 'utf-8') {
      superagent
        .get(url)
        .set('Referer', url)
        .charset('gbk')
        .end((err, res) => {
          if (err) {
            reject(err)
            throw Error(err)
          }
          let $content = cheerio.load(res.text, { decodeEntities: false })
          resolve($content)
        })
    } else {
      superagent
        .get(url)
        .set('cookie', opts.cookie || '')
        .end((err, res) => {
          if (err) {
            reject(err)
            throw Error(err)
          }
          let $content = cheerio.load(res.text, { decodeEntities: false })
          resolve($content)
        })
    }
  })
}

const resolveHtml = (targetUrl) => {
  return new Promise(async (resolve) => {
    try {
      let defaultUrl = '' // 自己默认的图片链接
      let $ = await resolvePage(targetUrl)
      let iconUrl = $("link[rel*='icon']").eq(0).attr('href')
      if (!iconUrl) {
        iconUrl = path.join(targetUrl.replace('https://', '').replace('http://', '').split('/')[0], '/favicon.ico')
      } else if (!iconUrl.includes('http://') && !iconUrl.includes('https://')) {
        if (iconUrl[0] === '/') {
          iconUrl = path.join(targetUrl.replace('https://', '').replace('http://', '').split('/')[0], iconUrl)
        } else {
          iconUrl = path.join(targetUrl, iconUrl)
        }
      }
      if (iconUrl !== '' && !iconUrl.includes('http://') && !iconUrl.includes('https://')) {
        iconUrl = `//${iconUrl}`
      }
      iconUrl = iconUrl.replace(/\\/g, '/')
      let title = $('title').eq(0).text()
      if ($('title').length === 0) {
        let url = targetUrl.replace('https://', '').replace('http://', '')
        if (url.split('.').length === 2) {
          url = `www.${url}`
        }
        url = `http://${url}`
        $ = await resolvePage(url)
        title = $('title').eq(0).text()
      }
      resolve({ title, iconUrl })
    } catch (e) {
      resolve({ title: '', iconUrl: '' })
    }
  })
}

const getWebSiteInfo = async (targetUrl) => {
  const res = await resolveHtml(targetUrl)
  return res
}

// 加盐加密
const encryptByHmac = (text) => {
  const result = crypto.createHmac('sha1', hmacKey).update(text).digest('hex')
  return result
}

module.exports = { checkToken, cosUpload, getWebSiteInfo, randomCode, encryptByHmac }
