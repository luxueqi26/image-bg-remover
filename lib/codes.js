/**
 * 验证码存储 - 内存 Map，5分钟过期
 * 生产环境替换为 Redis 或 CloudBase 数据库
 */

const codes = new Map()

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
