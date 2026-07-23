import crypto from 'crypto'

/**
 * 数据库抽象层
 * 当前：内存存储（开发阶段，容器重启后数据丢失）
 * 后续：替换为 CloudBase NoSQL 数据库 HTTP API 调用
 *
 * 两个集合：
 * - users: 用户主表 { _id, nickname, avatar, created_at }
 * - user_identities: 身份绑定表 { _id, user_id, provider, identifier, created_at }
 *   provider: 'phone' | 'wechat'
 *   identifier: 手机号或微信 openid
 */

const users = new Map()
const identities = new Map()
const sessions = new Map() // session_id -> { user_id, created_at }

export function findUserById(userId) {
  return users.get(userId) || null
}

export function findUserByIdentity(provider, identifier) {
  for (const identity of identities.values()) {
    if (identity.provider === provider && identity.identifier === identifier) {
      return identity
    }
  }
  return null
}

export function createUser(nickname) {
  const userId = 'u_' + crypto.randomBytes(8).toString('hex')
  const user = {
    _id: userId,
    nickname: nickname || ('用户' + userId.slice(-6)),
    avatar: '',
    created_at: new Date().toISOString(),
  }
  users.set(userId, user)
  return user
}

export function bindIdentity(userId, provider, identifier) {
  const identityId = 'i_' + crypto.randomBytes(8).toString('hex')
  const identity = {
    _id: identityId,
    user_id: userId,
    provider,
    identifier,
    created_at: new Date().toISOString(),
  }
  identities.set(identityId, identity)
  return identity
}

export function getUserIdentities(userId) {
  const result = []
  for (const identity of identities.values()) {
    if (identity.user_id === userId) {
      result.push(identity)
    }
  }
  return result
}

export function updateUser(userId, updates) {
  const user = users.get(userId)
  if (!user) return null
  Object.assign(user, updates)
  users.set(userId, user)
  return user
}

export function createSession(userId) {
  const sessionId = crypto.randomBytes(32).toString('hex')
  sessions.set(sessionId, {
    user_id: userId,
    created_at: new Date().toISOString(),
  })
  return sessionId
}

export function getSessionUser(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return null
  return session.user_id
}

export function deleteSession(sessionId) {
  sessions.delete(sessionId)
}

// 导出调试用（生产环境移除）
export function _debugGetAll() {
  return {
    users: Array.from(users.values()),
    identities: Array.from(identities.values()),
    sessions: Array.from(sessions.values()),
  }
}
