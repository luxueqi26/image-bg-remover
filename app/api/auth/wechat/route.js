import crypto from 'crypto'

export async function GET(request) {
  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET

  if (!appId || !appSecret) {
    return Response.json(
      { error: '微信登录未配置，请在微信开放平台创建网站应用并配置 AppID/AppSecret' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const redirectUri = searchParams.get('redirect_uri') || new URL('/', request.url).toString()

  // 生成 state 防 CSRF
  const state = crypto.randomBytes(8).toString('hex')

  // 微信开放平台网页授权 URL
  const wxAuthUrl = 'https://open.weixin.qq.com/connect/qrconnect'
  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state: state,
  })

  const authUrl = `${wxAuthUrl}?${params.toString()}#wechat_redirect`

  // 将 state 存入 cookie 用于回调校验
  const response = Response.redirect(authUrl, 302)
  response.headers.set(
    'Set-Cookie',
    `wx_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  )
  return response
}
