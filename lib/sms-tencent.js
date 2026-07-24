/**
 * 腾讯云短信发送工具
 *
 * 需要配置环境变量：
 *   TENCENT_SMS_SECRET_ID    - 腾讯云 API SecretId
 *   TENCENT_SMS_SECRET_KEY   - 腾讯云 API SecretKey
 *   TENCENT_SMS_SDK_APP_ID   - 短信 SDK AppID
 *   TENCENT_SMS_SIGN_NAME    - 短信签名内容（如"AI抠图"）
 *   TENCENT_SMS_TEMPLATE_ID  - 短信模板 ID
 *
 * 短信模板格式要求：验证码必须放在模板的 {1} 位置
 * 模板示例正文：您的验证码为 {1}，5分钟内有效，请勿告知他人。
 */

// 延迟 require 避免本地开发时缺少 SDK 报错
function getTencentSMSClient() {
  let tencentcloud
  try {
    tencentcloud = require('tencentcloud-sdk-nodejs-sms')
  } catch {
    // 尝试旧版包名
    try {
      tencentcloud = require('tencentcloud-sdk-nodejs')
    } catch {
      return null
    }
  }
  return tencentcloud
}

export async function sendTencentSMS(phone, code) {
  const secretId = process.env.TENCENT_SMS_SECRET_ID
  const secretKey = process.env.TENCENT_SMS_SECRET_KEY
  const sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID
  const signName = process.env.TENCENT_SMS_SIGN_NAME
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID

  // 缺少配置时返回错误
  const missing = []
  if (!secretId) missing.push('TENCENT_SMS_SECRET_ID')
  if (!secretKey) missing.push('TENCENT_SMS_SECRET_KEY')
  if (!sdkAppId) missing.push('TENCENT_SMS_SDK_APP_ID')
  if (!signName) missing.push('TENCENT_SMS_SIGN_NAME')
  if (!templateId) missing.push('TENCENT_SMS_TEMPLATE_ID')
  if (missing.length > 0) {
    throw new Error(`腾讯云短信配置不完整，缺少: ${missing.join(', ')}`)
  }

  const tencentcloud = getTencentSMSClient()
  if (!tencentcloud) {
    throw new Error('腾讯云 SDK 未安装，请运行: npm install tencentcloud-sdk-nodejs-sms')
  }

  const SmsClient = tencentcloud.sms.v20210111.Client

  const client = new SmsClient({
    credential: {
      secretId,
      secretKey,
    },
    region: 'ap-guangzhou',
    profile: {
      httpProfile: {
        endpoint: 'sms.tencentcloudapi.com',
      },
    },
  })

  // 国内手机号格式处理：去掉 +86 前缀，加 86 前缀
  let phoneNumber = phone.replace(/^\+?86/, '')
  phoneNumber = `+86${phoneNumber}`

  const params = {
    SmsSdkAppId: sdkAppId,
    SignName: signName,
    TemplateId: templateId,
    // 模板参数，对应模板中的 {1}, {2}...
    TemplateParamSet: [code],
    // 手机号，格式: +8613800138000
    PhoneNumberSet: [phoneNumber],
  }

  const response = await client.SendSms(params)

  // 检查发送结果
  const sendStatusSet = response.SendStatusSet || []
  if (sendStatusSet.length === 0) {
    throw new Error('短信发送失败：无返回结果')
  }

  const result = sendStatusSet[0]
  if (result.Code !== 'Ok') {
    throw new Error(`短信发送失败: ${result.Code} - ${result.Message}`)
  }

  return {
    success: true,
    serialNo: result.SerialNo,
    fee: result.Fee,
  }
}
