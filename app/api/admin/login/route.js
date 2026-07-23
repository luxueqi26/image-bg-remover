import { verifyAdminToken } from '@/lib/admin-auth'
import crypto from 'crypto'

/**
 * 管理员登录 API
 * POST /api/admin/login  { username, password }
 * 返回 JWT token（存 HttpOnly cookie）
 *
 * 内置超级管理员：通过环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 配置
 * 默认值：admin / admin123（生产环境必须改！）
 */

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_koutu_secret_2026'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'admin_root'

function makeToken(username) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    admin_id: ADMIN_USER_ID,
    username,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天
  })).toString('base64url')
  const sig = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(header + '.' + payload).digest('base64url')
  return header + '.' + payload + '.' + sig
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return Response.json({ error: '请输入账号和密码' }, { status: 400 })
    }

    // 验证内置超级管理员（不查数据库，启动后立即可用）
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return Response.json({
        error: '账号或密码错误',
        debug: {
          inputUsername: username,
          expectedUsername: ADMIN_USERNAME,
          inputPasswordLength: String(password).length,
          expectedPasswordLength: ADMIN_PASSWORD.length,
          hasEnvUsername: !!process.env.ADMIN_USERNAME,
          hasEnvPassword: !!process.env.ADMIN_PASSWORD,
        }
      }, { status: 401 })
    }

    const token = makeToken(username)

    return Response.json({
      success: true,
      token,
      admin: { username },
    }, {
      headers: {
        'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
      }
    })
  } catch (err) {
    console.error('Admin login error:', err)
    return Response.json({
      error: '登录失败',
      debug: {
        errMsg: err.message,
        errName: err.name,
        errStack: (err.stack || '').slice(0, 300),
      }
    }, { status: 500 })
  }
}