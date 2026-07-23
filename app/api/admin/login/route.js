import { findAdmin, createAdmin } from '@/lib/db'
import crypto from 'crypto'

/**
 * 管理员登录 API
 * POST /api/admin/login  { username, password }
 * 返回 JWT token（存 HttpOnly cookie）
 */

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_koutu_secret_2026'

function makeToken(admin) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    admin_id: admin._id,
    username: admin.username,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天
  })).toString('base64url')
  const sig = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(header + '.' + payload).digest('base64url')
  return header + '.' + payload + '.' + sig
}

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return Response.json({ error: '请输入账号和密码' }, { status: 400 })
    }

    let admin = await findAdmin(username)

    // 首次登录：如果没有管理员，自动创建默认管理员
    if (!admin && username === 'admin' && password === 'admin123') {
      const password_hash = crypto.createHash('sha256').update(password).digest('hex')
      admin = await createAdmin({ username, password_hash })
    }

    if (!admin) {
      return Response.json({ error: '账号不存在' }, { status: 401 })
    }

    const password_hash = crypto.createHash('sha256').update(password).digest('hex')
    if (admin.password_hash !== password_hash) {
      return Response.json({ error: '密码错误' }, { status: 401 })
    }

    const token = makeToken(admin)

    return Response.json({
      success: true,
      token,
      admin: { username: admin.username },
    }, {
      headers: {
        'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
      }
    })
  } catch (err) {
    console.error('Admin login error:', err)
    return Response.json({ error: '登录失败' }, { status: 500 })
  }
}
