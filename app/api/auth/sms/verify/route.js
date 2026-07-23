import { verifyCode } from '@/lib/codes'
import { findUserByIdentity, findUserById, createUser, bindIdentity } from '@/lib/db'
import { generateToken } from '@/lib/auth'

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

export async function POST(request) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !isValidPhone(phone)) {
      return Response.json({ error: '请输入正确的手机号' }, { status: 400 })
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return Response.json({ error: '请输入6位验证码' }, { status: 400 })
    }

    // 校验验证码
    if (!verifyCode(phone, code)) {
      return Response.json({ error: '验证码错误或已过期' }, { status: 400 })
    }

    // 查找或创建用户
    const identity = await findUserByIdentity('phone', phone)
    let user
    if (identity) {
      // 老用户，直接登录
      user = await findUserById(identity.user_id)
    } else {
      // 新用户，自动注册
      user = await createUser()
      await bindIdentity(user._id, 'phone', phone)
    }

    // 生成 JWT token
    const token = generateToken({
      user_id: user._id,
      nickname: user.nickname,
    })

    const response = Response.json({
      success: true,
      user: {
        user_id: user._id,
        nickname: user.nickname,
        avatar: user.avatar || '',
        phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
      },
    })

    // 设置 HttpOnly cookie
    response.headers.set(
      'Set-Cookie',
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; ${
        process.env.NODE_ENV === 'production' ? 'Secure' : ''
      }`
    )

    return response
  } catch (err) {
    console.error('SMS verify error:', err)
    return Response.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
}
