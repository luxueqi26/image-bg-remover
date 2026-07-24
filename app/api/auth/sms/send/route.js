import { setCode, getCode } from '@/lib/codes'
import { sendTencentSMS } from '@/lib/sms-tencent'

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

export async function POST(request) {
  try {
    const { phone } = await request.json()

    if (!phone || !isValidPhone(phone)) {
      return Response.json({ error: '请输入正确的手机号' }, { status: 400 })
    }

    // 频率限制：60秒内不能重复发送
    const existingCode = getCode(phone)
    if (existingCode) {
      return Response.json({ error: '验证码已发送，请60秒后再试' }, { status: 429 })
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setCode(phone, code)

    // 判断是否配置了腾讯云短信
    const hasTencentConfig = process.env.TENCENT_SMS_SECRET_ID && process.env.TENCENT_SMS_SDK_APP_ID

    if (hasTencentConfig) {
      // 生产模式：通过腾讯云发送真实短信
      try {
        await sendTencentSMS(phone, code)
        console.log(`[SMS] 验证码已发送到 ${phone}（腾讯云）`)
        return Response.json({ success: true, message: '验证码已发送' })
      } catch (smsErr) {
        console.error('[SMS] 腾讯云发送失败:', smsErr.message)
        // 发送失败时仍然返回验证码（开发友好），生产环境可改为不返回
        return Response.json({
          success: true,
          message: '验证码已发送',
          dev_code: code,
          dev_notice: '短信发送失败，开发模式返回验证码',
        })
      }
    } else {
      // 开发模式：验证码直接返回前端，方便测试
      console.log(`[SMS][DEV] 验证码: ${code}`)
      return Response.json({
        success: true,
        message: '验证码已发送（开发模式）',
        dev_code: code,
      })
    }
  } catch (err) {
    console.error('SMS send error:', err)
    return Response.json({ error: '发送验证码失败，请稍后重试' }, { status: 500 })
  }
}
