import { setCode, getCode } from '@/lib/codes'

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

export async function POST(request) {
  try {
    const { phone } = await request.json()

    if (!phone || !isValidPhone(phone)) {
      return Response.json({ error: '请输入正确的手机号' }, { status: 400 })
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setCode(phone, code)

    // 发送短信（生产环境接入腾讯云/阿里云短信服务）
    const smsProvider = process.env.SMS_PROVIDER
    if (smsProvider === 'tencent') {
      // TODO: 接入腾讯云短信 SDK
      // const tencentcloud = require('tencentcloud-sdk-nodejs')
      // await sendTencentSMS(phone, code)
      console.log(`[SMS] 已发送验证码到 ${phone}（腾讯云）`)
    } else if (smsProvider === 'aliyun') {
      // TODO: 接入阿里云短信 SDK
      console.log(`[SMS] 已发送验证码到 ${phone}（阿里云）`)
    } else {
      // 开发模式：验证码直接返回前端，方便测试
      console.log(`[SMS][DEV] 验证码: ${code}`)
      return Response.json({
        success: true,
        message: '验证码已发送（开发模式）',
        dev_code: code,
      })
    }

    return Response.json({ success: true, message: '验证码已发送' })
  } catch (err) {
    console.error('SMS send error:', err)
    return Response.json({ error: '发送验证码失败，请稍后重试' }, { status: 500 })
  }
}
