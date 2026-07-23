import { verifyToken } from '@/lib/auth'
import { findUserById, getUserIdentities } from '@/lib/db'

export async function GET(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const tokenCookie = cookieHeader
    .split('; ')
    .find((c) => c.startsWith('token='))

  if (!tokenCookie) {
    return Response.json({ user: null })
  }

  const token = tokenCookie.split('=')[1]
  const payload = verifyToken(token)

  if (!payload) {
    return Response.json({ user: null })
  }

  const user = findUserById(payload.user_id)
  if (!user) {
    return Response.json({ user: null })
  }

  // 获取用户绑定的登录方式
  const identities = getUserIdentities(user._id)
  const phoneIdentity = identities.find((i) => i.provider === 'phone')
  const wechatIdentity = identities.find((i) => i.provider === 'wechat')

  return Response.json({
    user: {
      user_id: user._id,
      nickname: user.nickname,
      avatar: user.avatar || '',
      phone: phoneIdentity
        ? phoneIdentity.identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        : null,
      wechat_bound: !!wechatIdentity,
    },
  })
}
