import { findUserByIdentity, createUser, bindIdentity, findUserById, updateUser } from '@/lib/db'
import { generateToken } from '@/lib/auth'

export async function GET(request) {
  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET

  if (!appId || !appSecret) {
    return Response.json(
      { error: '微信登录未配置' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieHeader = request.headers.get('cookie') || ''
  const stateCookie = cookieHeader
    .split('; ')
    .find((c) => c.startsWith('wx_state='))
  const savedState = stateCookie ? stateCookie.split('=')[1] : null

  if (!code) {
    return redirectWithError('授权失败：未收到微信授权码')
  }
  if (!state || state !== savedState) {
    return redirectWithError('授权失败：state 校验不通过')
  }

  try {
    // 第一步：用 code 换取 access_token 和 openid
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.errcode) {
      console.error('Wechat token error:', tokenData)
      return redirectWithError('微信授权失败：' + tokenData.errmsg)
    }

    const { access_token, openid, unionid } = tokenData

    // 第二步：用 access_token 获取用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`
    const userInfoRes = await fetch(userInfoUrl)
    const wxUserInfo = await userInfoRes.json()

    if (wxUserInfo.errcode) {
      console.error('Wechat userinfo error:', wxUserInfo)
      return redirectWithError('获取微信用户信息失败')
    }

    // 使用 unionid 优先，没有则用 openid
    const identifier = unionid || openid

    // 查找或创建用户
    const identity = await findUserByIdentity('wechat', identifier)
    let user
    if (identity) {
      // 老用户，更新头像和昵称
      user = await findUserById(identity.user_id)
      if (wxUserInfo.nickname || wxUserInfo.headimgurl) {
        user = await updateUser(user._id, {
          nickname: wxUserInfo.nickname || user.nickname,
          avatar: wxUserInfo.headimgurl || user.avatar,
        })
      }
    } else {
      // 新用户，自动注册
      user = await createUser(wxUserInfo.nickname)
      if (wxUserInfo.headimgurl) {
        user = await updateUser(user._id, { avatar: wxUserInfo.headimgurl })
      }
      await bindIdentity(user._id, 'wechat', identifier)
    }

    // 生成 JWT token
    const token = generateToken({
      user_id: user._id,
      nickname: user.nickname,
    })

    // 重定向回首页，token 通过 cookie 设置
    const redirectUrl = new URL('/', request.url)
    const response = Response.redirect(redirectUrl.toString(), 302)

    // 设置 token cookie
    response.headers.set(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; ${
        process.env.NODE_ENV === 'production' ? 'Secure' : ''
      }`
    )
    // 清除 wx_state cookie
    response.headers.append(
      'Set-Cookie',
      `wx_state=; Path=/; HttpOnly; Max-Age=0`
    )

    return response
  } catch (err) {
    console.error('Wechat callback error:', err)
    return redirectWithError('微信登录异常，请重试')
  }
}

function redirectWithError(message) {
  const redirectUrl = new URL('/?login_error=' + encodeURIComponent(message), process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
  return Response.redirect(redirectUrl.toString(), 302)
}
