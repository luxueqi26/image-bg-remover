/**
 * 验证码存储 - 内存 Map，5分钟过期
 * 生产环境替换为 Redis 或 CloudBase 数据库
 *
 * 注意：使用 globalThis 确保在 Next.js dev 模式下
 * 不同 API Route 共享同一个 Map 实例
 */

if (!globalThis.__smsCodes) {
  globalThis.__smsCodes = new Map()
}

const codes = globalThis.__smsCodes

export function setCode(phone, code) {
  codes.set(phone, {
    code,
    expires: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  })
}

export function verifyCode(phone, inputCode) {
  const record = codes.get(phone)
  if (!record) return false
  if (Date.now() > record.expires) {
    codes.delete(phone)
    return false
  }
  if (record.attempts >= 5) {
    codes.delete(phone)
    return false
  }
  record.attempts++
  if (record.code !== inputCode) return false
  codes.delete(phone)
  return true
}

export function getCode(phone) {
  const record = codes.get(phone)
  if (!record) return null
  if (Date.now() > record.expires) {
    codes.delete(phone)
    return null
  }
  return record.code
}
