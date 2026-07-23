import crypto from 'crypto'

/**
 * 数据库抽象层
 *
 * 生产环境：CloudBase NoSQL 数据库（持久化存储）
 * 本地开发：内存 Map（未配置 CLOUDBASE_ENV_ID 时自动降级）
 *
 * 集合：
 * - users: 用户主表 { _id, nickname, avatar, created_at, last_login }
 * - user_identities: 身份绑定表 { _id, user_id, provider, identifier, created_at }
 * - orders: 订单表 { _id, user_id, out_trade_no, amount, status, pay_method, created_at, paid_at }
 * - usage_logs: 使用记录 { _id, user_id, image_name, image_size, source, processing_ms, created_at }
 * - pricing: 套餐配置 { _id: "pricing", single_price, free_daily, updated_at }
 * - admins: 管理员 { _id, username, password_hash, created_at }
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
if (!globalThis.__dbOrders) globalThis.__dbOrders = new Map()
if (!globalThis.__dbUsageLogs) globalThis.__dbUsageLogs = new Map()
if (!globalThis.__dbPricing) globalThis.__dbPricing = { _id: 'pricing', single_price: 199, free_daily: 1, updated_at: new Date().toISOString() }
if (!globalThis.__dbAdmins) globalThis.__dbAdmins = new Map()

const memUsers = globalThis.__dbUsers
const memIdentities = globalThis.__dbIdentities
const memOrders = globalThis.__dbOrders
const memUsageLogs = globalThis.__dbUsageLogs
const memPricing = globalThis.__dbPricing
const memAdmins = globalThis.__dbAdmins

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

// ===== 订单表 orders =====

export async function createOrder({ user_id, out_trade_no, amount, pay_method }) {
  const order = {
    _id: 'o_' + crypto.randomBytes(8).toString('hex'),
    user_id: user_id || '',
    out_trade_no,
    amount,
    status: 'pending',
    pay_method: pay_method || 'wechat',
    created_at: new Date().toISOString(),
    paid_at: null,
  }

  const database = getDb()
  if (!database) {
    memOrders.set(order._id, order)
    return order
  }

  await database.collection('orders').add(order)
  return order
}

export async function updateOrderStatus(out_trade_no, status) {
  const database = getDb()

  if (!database) {
    for (const order of memOrders.values()) {
      if (order.out_trade_no === out_trade_no) {
        order.status = status
        if (status === 'paid') order.paid_at = new Date().toISOString()
        memOrders.set(order._id, order)
        return order
      }
    }
    return null
  }

  const update = { status }
  if (status === 'paid') update.paid_at = new Date().toISOString()

  await database.collection('orders')
    .where({ out_trade_no })
    .update(update)

  const res = await database.collection('orders')
    .where({ out_trade_no })
    .limit(1)
    .get()

  return res.data && res.data.length > 0 ? res.data[0] : null
}

export async function getOrder(out_trade_no) {
  const database = getDb()

  if (!database) {
    for (const order of memOrders.values()) {
      if (order.out_trade_no === out_trade_no) return order
    }
    return null
  }

  const res = await database.collection('orders')
    .where({ out_trade_no })
    .limit(1)
    .get()

  return res.data && res.data.length > 0 ? res.data[0] : null
}

export async function getOrdersByUserId(userId) {
  const database = getDb()

  if (!database) {
    return Array.from(memOrders.values()).filter(o => o.user_id === userId)
  }

  const res = await database.collection('orders')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .get()

  return res.data || []
}

export async function getAllOrders({ limit = 100, skip = 0 } = {}) {
  const database = getDb()

  if (!database) {
    return Array.from(memOrders.values())
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(skip, skip + limit)
  }

  const res = await database.collection('orders')
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return res.data || []
}

export async function getPaidOrdersByDateRange(startDate, endDate) {
  const database = getDb()

  if (!database) {
    return Array.from(memOrders.values()).filter(o =>
      o.status === 'paid' &&
      o.paid_at >= startDate &&
      o.paid_at <= endDate
    )
  }

  const res = await database.collection('orders')
    .where({
      status: 'paid',
      paid_at: db.command.gte(startDate).and(db.command.lte(endDate))
    })
    .get()

  return res.data || []
}

// ===== 使用记录 usage_logs =====

export async function createUsageLog({ user_id, image_name, image_size, source, processing_ms }) {
  const log = {
    _id: 'l_' + crypto.randomBytes(8).toString('hex'),
    user_id: user_id || '',
    image_name: image_name || '',
    image_size: image_size || 0,
    source: source || 'free',
    processing_ms: processing_ms || 0,
    created_at: new Date().toISOString(),
  }

  const database = getDb()
  if (!database) {
    memUsageLogs.set(log._id, log)
    return log
  }

  await database.collection('usage_logs').add(log)
  return log
}

export async function getUsageLogsByUserId(userId, { limit = 50 } = {}) {
  const database = getDb()

  if (!database) {
    return Array.from(memUsageLogs.values())
      .filter(l => l.user_id === userId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, limit)
  }

  const res = await database.collection('usage_logs')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get()

  return res.data || []
}

export async function getUsageCountByDate(dateStr) {
  const database = getDb()

  if (!database) {
    return Array.from(memUsageLogs.values())
      .filter(l => (l.created_at || '').startsWith(dateStr)).length
  }

  const res = await database.collection('usage_logs')
    .where({ created_at: db.command.regex('^' + dateStr) })
    .count()

  return res.total || 0
}

// ===== 套餐配置 pricing =====

export async function getPricing() {
  const database = getDb()

  if (!database) {
    return { ...memPricing }
  }

  const res = await database.collection('pricing')
    .doc('pricing')
    .get()

  if (res.data && res.data.length > 0) {
    return res.data[0]
  }

  // 初始化默认值
  const defaultPricing = {
    _id: 'pricing',
    single_price: 199,
    free_daily: 1,
    updated_at: new Date().toISOString(),
  }
  await database.collection('pricing').add(defaultPricing)
  return defaultPricing
}

export async function updatePricing({ single_price, free_daily }) {
  const updates = { updated_at: new Date().toISOString() }
  if (single_price !== undefined) updates.single_price = single_price
  if (free_daily !== undefined) updates.free_daily = free_daily

  const database = getDb()
  if (!database) {
    Object.assign(memPricing, updates)
    return { ...memPricing }
  }

  await database.collection('pricing').doc('pricing').update(updates)

  const res = await database.collection('pricing').doc('pricing').get()
  return res.data && res.data.length > 0 ? res.data[0] : { _id: 'pricing', ...updates }
}

// ===== 管理员 admins =====

export async function findAdmin(username) {
  const database = getDb()

  if (!database) {
    for (const admin of memAdmins.values()) {
      if (admin.username === username) return admin
    }
    return null
  }

  const res = await database.collection('admins')
    .where({ username })
    .limit(1)
    .get()

  return res.data && res.data.length > 0 ? res.data[0] : null
}

export async function createAdmin({ username, password_hash }) {
  const admin = {
    _id: 'a_' + crypto.randomBytes(8).toString('hex'),
    username,
    password_hash,
    created_at: new Date().toISOString(),
  }

  const database = getDb()
  if (!database) {
    memAdmins.set(admin._id, admin)
    return admin
  }

  await database.collection('admins').add(admin)
  return admin
}

// ===== 统计 =====

export async function getAllUsers({ limit = 100, skip = 0 } = {}) {
  const database = getDb()

  if (!database) {
    return Array.from(memUsers.values())
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(skip, skip + limit)
  }

  const res = await database.collection('users')
    .orderBy('created_at', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return res.data || []
}

export async function countUsers() {
  const database = getDb()

  if (!database) {
    return memUsers.size
  }

  const res = await database.collection('users').count()
  return res.total || 0
}

export async function countOrders(status) {
  const database = getDb()

  if (!database) {
    if (status) {
      return Array.from(memOrders.values()).filter(o => o.status === status).length
    }
    return memOrders.size
  }

  const query = status ? { status } : {}
  const res = await database.collection('orders').where(query).count()
  return res.total || 0
}

export async function sumPaidAmountByDate(dateStr) {
  const database = getDb()

  if (!database) {
    return Array.from(memOrders.values())
      .filter(o => o.status === 'paid' && (o.paid_at || '').startsWith(dateStr))
      .reduce((sum, o) => sum + (o.amount || 0), 0)
  }

  // CloudBase NoSQL 不支持直接 sum，需要查出后计算
  const res = await database.collection('orders')
    .where({
      status: 'paid',
      paid_at: db.command.regex('^' + dateStr)
    })
    .get()

  return (res.data || []).reduce((sum, o) => sum + (o.amount || 0), 0)
}
