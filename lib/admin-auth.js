import crypto from 'crypto'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin_koutu_secret_2026'

/**
 * 验证管理员 token（从 cookie 或 Authorization header 读取）
 */
export function verifyAdminToken(request) {
  let token = null

  // 从 cookie 读取
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(/admin_token=([^;]+)/)
  if (match) token = match[1]

  // 从 Authorization header 读取
  if (!token) {
    const auth = request.headers.get('authorization')
    if (auth && auth.startsWith('Bearer ')) token = auth.slice(7)
  }

  if (!token) return null

  try {
    const [header, payload, sig] = token.split('.')
    const expectedSig = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(header + '.' + payload).digest('base64url')

    if (sig !== expectedSig) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())

    if (data.exp && Date.now() > data.exp) return null
    if (data.role !== 'admin') return null

    return data
  } catch {
    return null
  }
}
