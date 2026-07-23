import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

/**
 * 微信支付 Native（扫码支付）工具库
 *
 * 需要用户将 apiclient_cert.pem 和 apiclient_key.pem 放到 certs/ 目录
 * certs/ 已在 .gitignore 中排除，不会上传到 GitHub
 *
 * CloudBase 部署时通过环境变量传递证书内容：
 *   WECHAT_PAY_CERT: 公钥证书内容（base64 编码）
 *   WECHAT_PAY_KEY: 私钥内容（base64 编码）
 */

let payInstance = null

function getCertPath() {
  // CloudBase 部署：从环境变量读取证书
  if (process.env.WECHAT_PAY_CERT && process.env.WECHAT_PAY_KEY) {
    const certDir = path.join(process.cwd(), 'certs')
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true })

    const certPath = path.join(certDir, 'apiclient_cert.pem')
    const keyPath = path.join(certDir, 'apiclient_key.pem')

    if (!fs.existsSync(certPath)) {
      fs.writeFileSync(certPath, Buffer.from(process.env.WECHAT_PAY_CERT, 'base64').toString())
    }
    if (!fs.existsSync(keyPath)) {
      fs.writeFileSync(keyPath, Buffer.from(process.env.WECHAT_PAY_KEY, 'base64').toString())
    }
    return { certPath, keyPath }
  }

  // 本地开发：从 certs/ 目录读取
  const certPath = path.join(process.cwd(), 'certs', 'apiclient_cert.pem')
  const keyPath = path.join(process.cwd(), 'certs', 'apiclient_key.pem')
  return { certPath, keyPath }
}

function getPayInstance() {
  if (payInstance) return payInstance

  const WxPay = require('wechatpay-node-v3')
  const { certPath, keyPath } = getCertPath()

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('微信支付证书文件不存在:', certPath, keyPath)
    return null
  }

  const mchid = process.env.WECHAT_PAY_MCH_ID
  if (!mchid) {
    console.error('WECHAT_PAY_MCH_ID 未设置')
    return null
  }

  payInstance = new WxPay({
    appid: process.env.WECHAT_APP_ID || '',
    mchid,
    publicKey: fs.readFileSync(certPath),
    privateKey: fs.readFileSync(keyPath),
    key: process.env.WECHAT_PAY_API_V3_KEY,
  })

  return payInstance
}

/**
 * 创建 Native 支付订单（返回 code_url 用于生成二维码）
 */
export async function createNativeOrder({ description, outTradeNo, total, notifyUrl }) {
  const pay = getPayInstance()
  if (!pay) {
    throw new Error('微信支付未配置：请设置 WECHAT_PAY_MCH_ID 环境变量并上传证书到 certs/ 目录')
  }

  try {
    const result = await pay.transactions_native({
      description,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total,        // 单位：分
        currency: 'CNY',
      },
    })

    // SDK v2.x: 成功时 result 本身就包含 code_url
    if (result.status === 200 || result.status === 204) {
      const codeUrl = result.code_url || result.data?.code_url
      if (codeUrl) {
        return { code_url: codeUrl }
      }
      throw new Error('微信返回成功但缺少code_url')
    }

    throw new Error(result.message || result.data?.message || result.statusText || '创建订单失败')
  } catch (err) {
    console.error('Wechat pay error:', err.message || err)
    throw err
  }
}

/**
 * 查询订单支付状态
 */
export async function queryOrder(outTradeNo) {
  const pay = getPayInstance()
  if (!pay) throw new Error('微信支付未配置')

  try {
    const result = await pay.query({
      out_trade_no: outTradeNo,
    })

    // SDK v2.x: 数据可能在 result 顶层或 result.data 里
    const data = result.data || result
    return {
      trade_state: data.trade_state,
      transaction_id: data.transaction_id,
    }
  } catch (err) {
    console.error('Query order error:', err)
    throw err
  }
}

/**
 * 验证微信支付回调签名并解密数据
 */
export function verifyAndDecryptCallback(signature, timestamp, nonce, body) {
  const pay = getPayInstance()
  if (!pay) throw new Error('微信支付未配置')

  // 验证签名
  const verified = pay.verifySign({
    signature,
    timestamp,
    nonce,
    body,
  })

  if (!verified) {
    throw new Error('签名验证失败')
  }

  // 解密回调数据
  const resource = body.resource
  const decrypted = pay.decipher_gcm(
    resource.ciphertext,
    resource.associated_data,
    resource.nonce,
    process.env.WECHAT_PAY_API_V3_KEY
  )

  return JSON.parse(decrypted.toString())
}

/**
 * 生成订单号
 */
export function generateOutTradeNo() {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = crypto.randomBytes(6).toString('hex')
  return `KOUTU${dateStr}${random}`
}
