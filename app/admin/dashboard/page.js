'use client'

import { useState, useEffect } from 'react'

export default function AdminDashboard() {
  const [view, setView] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [pricing, setPricing] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) {
        window.location.href = '/admin'
        return
      }
      const data = await res.json()
      if (data.success) setStats(data.stats)
    } catch {}
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.success) setUsers(data.users)
    } catch {} finally { setLoading(false) }
  }

  async function loadUserDetail(userId) {
    try {
      const res = await fetch(`/api/admin/users?user_id=${userId}`)
      const data = await res.json()
      if (data.success) {
        setUserDetail(data.detail)
        setSelectedUser(userId)
      }
    } catch {}
  }

  async function loadOrders() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/orders')
      const data = await res.json()
      if (data.success) setOrders(data.orders)
    } catch {} finally { setLoading(false) }
  }

  async function loadPricing() {
    try {
      const res = await fetch('/api/admin/pricing')
      const data = await res.json()
      if (data.success) setPricing(data.pricing)
    } catch {}
  }

  async function savePricing(singlePrice, freeDaily) {
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ single_price: singlePrice, free_daily: freeDaily }),
      })
      const data = await res.json()
      if (data.success) {
        setPricing(data.pricing)
        alert('保存成功')
      }
    } catch {}
  }

  function switchView(v) {
    setView(v)
    setSelectedUser(null)
    setUserDetail(null)
    if (v === 'users') loadUsers()
    if (v === 'orders') loadOrders()
    if (v === 'pricing') loadPricing()
    if (v === 'dashboard') loadStats()
  }

  function formatTime(iso) {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const NAV = [
    { key: 'dashboard', label: '数据概览' },
    { key: 'users', label: '用户管理' },
    { key: 'orders', label: '订单管理' },
    { key: 'pricing', label: '套餐设置' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="w-52 bg-gray-900 min-h-screen flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <h1 className="text-white font-bold text-sm">AI 抠图后台</h1>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => switchView(item.key)}
              className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${
                view === item.key
                  ? 'text-white bg-gray-800 border-l-2 border-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <a href="/" className="text-xs text-gray-500 hover:text-white">返回首页</a>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 p-8 overflow-auto">
        {view === 'dashboard' && stats && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-6">数据概览</h2>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <StatCard label="今日抠图次数" value={stats.todayUsage} color="blue" />
              <StatCard label="今日收入" value={`¥${stats.todayRevenueYuan}`} color="green" />
              <StatCard label="注册用户数" value={stats.totalUsers} color="amber" />
              <StatCard label="已支付订单" value={stats.paidOrders} color="coral" />
            </div>
          </div>
        )}

        {view === 'users' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-6">用户管理</h2>
            {selectedUser && userDetail ? (
              <div>
                <button onClick={() => { setSelectedUser(null); setUserDetail(null) }} className="text-sm text-blue-500 hover:underline mb-4">← 返回列表</button>
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
                  <h3 className="font-bold mb-4">使用记录（{userDetail.usageLogs.length}条）</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-400 border-b">
                      <th className="pb-2">文件名</th><th className="pb-2">大小</th><th className="pb-2">来源</th><th className="pb-2">耗时</th><th className="pb-2">时间</th>
                    </tr></thead>
                    <tbody>
                      {userDetail.usageLogs.map(log => (
                        <tr key={log._id} className="border-b border-gray-100">
                          <td className="py-2 truncate max-w-32">{log.image_name || '-'}</td>
                          <td className="py-2">{((log.image_size||0)/1024).toFixed(0)}KB</td>
                          <td className="py-2"><span className={log.source === 'free' ? 'text-green-500' : 'text-blue-500'}>{log.source}</span></td>
                          <td className="py-2">{((log.processing_ms||0)/1000).toFixed(1)}s</td>
                          <td className="py-2">{formatTime(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-bold mb-4">订单记录（{userDetail.orderCount}条，已支付{userDetail.paidCount}条，共¥{userDetail.totalSpentYuan}）</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-gray-400 border-b">
                      <th className="pb-2">订单号</th><th className="pb-2">金额</th><th className="pb-2">方式</th><th className="pb-2">状态</th><th className="pb-2">时间</th>
                    </tr></thead>
                    <tbody>
                      {userDetail.orders.map(o => (
                        <tr key={o._id} className="border-b border-gray-100">
                          <td className="py-2 font-mono text-xs">{o.out_trade_no}</td>
                          <td className="py-2">¥{o.amountYuan || (o.amount/100).toFixed(2)}</td>
                          <td className="py-2">{o.pay_method}</td>
                          <td className="py-2"><span className={o.status === 'paid' ? 'text-green-500' : 'text-gray-400'}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                          <td className="py-2">{formatTime(o.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-400 border-b bg-gray-50">
                    <th className="px-4 py-3">昵称</th><th className="px-4 py-3">注册时间</th><th className="px-4 py-3">订单数</th><th className="px-4 py-3">已支付</th><th className="px-4 py-3">消费总额</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} onClick={() => loadUserDetail(u._id)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3 font-medium">{u.nickname || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{formatTime(u.created_at)}</td>
                        <td className="px-4 py-3">{u.orderCount || 0}</td>
                        <td className="px-4 py-3">{u.paidCount || 0}</td>
                        <td className="px-4 py-3">¥{u.totalSpentYuan || '0.00'}</td>
                      </tr>
                    ))}
                    {!loading && users.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-400">暂无用户</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === 'orders' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-6">订单管理</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 border-b bg-gray-50">
                  <th className="px-4 py-3">订单号</th><th className="px-4 py-3">用户ID</th><th className="px-4 py-3">金额</th><th className="px-4 py-3">方式</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">时间</th>
                </tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{o.out_trade_no}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{o.user_id || '-'}</td>
                      <td className="px-4 py-3">¥{o.amountYuan}</td>
                      <td className="px-4 py-3">{o.pay_method}</td>
                      <td className="px-4 py-3"><span className={o.status === 'paid' ? 'text-green-500' : 'text-gray-400'}>{o.status === 'paid' ? '已支付' : '待支付'}</span></td>
                      <td className="px-4 py-3 text-gray-500">{formatTime(o.created_at)}</td>
                    </tr>
                  ))}
                  {!loading && orders.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-400">暂无订单</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'pricing' && (
          <PricingSettings pricing={pricing} onSave={savePricing} />
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    coral: 'bg-orange-50 border-orange-200 text-orange-900',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-70">{label}</p>
    </div>
  )
}

function PricingSettings({ pricing, onSave }) {
  const [singlePrice, setSinglePrice] = useState('')
  const [freeDaily, setFreeDaily] = useState('')

  useEffect(() => {
    if (pricing) {
      setSinglePrice(pricing.single_price_yuan || (pricing.single_price / 100).toFixed(2))
      setFreeDaily(String(pricing.free_daily))
    }
  }, [pricing])

  if (!pricing) return <div className="text-gray-400">加载中...</div>

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-6">套餐设置</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">单次价格（元）</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">¥</span>
            <input
              type="number"
              step="0.01"
              value={singlePrice}
              onChange={(e) => setSinglePrice(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">修改后立即生效，新订单按新价格</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">每日免费次数</label>
          <input
            type="number"
            min="0"
            value={freeDaily}
            onChange={(e) => setFreeDaily(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900"
          />
          <p className="text-xs text-gray-400 mt-1">设为 0 表示不提供免费次数（需付费才能使用）</p>
        </div>

        <button
          onClick={() => onSave(parseFloat(singlePrice), parseInt(freeDaily))}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
        >
          保存设置
        </button>
      </div>
    </div>
  )
}
