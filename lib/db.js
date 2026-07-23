import crypto from 'crypto'

/**
 * 数据库抽象层
 *
 * 生产环境：CloudBase NoSQL 数据库（持久化存储）
 * 本地开发：内存 Map（未配置 CLOUDBASE_ENV_ID 时自动降级）
 *
 * 两个集合：
 * - users: 用户主表 { _id, nickname, avatar, created_at }
 * - user_identities: 身份绑定表 { _id, user_id, provider, identifier, created_at }
 *   provider: 'phone' | 'wechat'
 *   identifier: 手机号或微信 openid
 */

// ===== CloudBase 数据库初始化 =====

let db = null

function getDb() {
  if (db) return db

  const envId = process.env.CLOUDBASE_ENV_ID
  if (!envId) {
    // 本地开发模式，没有配置 CloudBase 环境ID，用内存
    return null
  }

  // 动态 require 避免本地开发时缺少 SDK 报错
  const cloudbase = require('@cloudbase/node-sdk')
  const app = cloudbase.init({ env: envId })
  db = app.database()
  return db
}

// ===== 内存模式 fallback =====

if (!globalThis.__dbUsers) globalThis.__dbUsers = new Map()
if (!globalThis.__dbIdentities) globalThis.__dbIdentities = new Map()

const memUsers = globalThis.__dbUsers
const memIdentities = globalThis.__dbIdentities

// ===== 统一 API（自动选择 CloudBase 或内存） =====

export async function findUserById(userId) {
  const database = getDb()

  if (!database) {
    return memUsers.get(userId) || null
  }

  const res = await database.collection('users').doc(userId).get()
  return res.data && res.data.length > 0 ? res.data[0] : null
}

export async function findUserByIdentity(provider, identifier) {
  const database = getDb()

  if (!database) {
    for (const identity of memIdentities.values()) {
      if (identity.provider === provider && identity.identifier === identifier) {
        return identity
      }
    }
    return null
  }

  const res = await database.collection('user_identities')
    .where({ provider, identifier })
    .limit(1)
    .get()

  return res.data && res.data.length > 0 ? res.data[0] : null
}

export async function createUser(nickname) {
  const userId = 'u_' + crypto.randomBytes(8).toString('hex')
  const user = {
    _id: userId,
    nickname: nickname || ('用户' + userId.slice(-6)),
    avatar: '',
    created_at: new Date().toISOString(),
  }

  const database = getDb()
  if (!database) {
    memUsers.set(userId, user)
    return user
  }

  await database.collection('users').add(user)
  return user
}

export async function bindIdentity(userId, provider, identifier) {
  const identityId = 'i_' + crypto.randomBytes(8).toString('hex')
  const identity = {
    _id: identityId,
    user_id: userId,
    provider,
    identifier,
    created_at: new Date().toISOString(),
  }

  const database = getDb()
  if (!database) {
    memIdentities.set(identityId, identity)
    return identity
  }

  await database.collection('user_identities').add(identity)
  return identity
}

export async function getUserIdentities(userId) {
  const database = getDb()

  if (!database) {
    const result = []
    for (const identity of memIdentities.values()) {
      if (identity.user_id === userId) {
        result.push(identity)
      }
    }
    return result
  }

  const res = await database.collection('user_identities')
    .where({ user_id: userId })
    .get()

  return res.data || []
}

export async function updateUser(userId, updates) {
  const database = getDb()

  if (!database) {
    const user = memUsers.get(userId)
    if (!user) return null
    Object.assign(user, updates)
    memUsers.set(userId, user)
    return user
  }

  await database.collection('users').doc(userId).update(updates)
  const res = await database.collection('users').doc(userId).get()
  return res.data && res.data.length > 0 ? res.data[0] : null
}
