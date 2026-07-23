import { verifyAdminToken } from '@/lib/admin-auth'
import { getAllUsers, getOrdersByUserId, getUsageLogsByUserId } from '@/lib/db'

export async function GET(request) {
  const admin = verifyAdminToken(request)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    // 查看单个用户详情
    if (userId) {
      const orders = await getOrdersByUserId(userId)
      const usageLogs = await getUsageLogsByUserId(userId)
      const paidOrders = orders.filter(o => o.status === 'paid')
      const totalSpent = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0)

      return Response.json({
        success: true,
        detail: {
          orders,
          usageLogs,
          orderCount: orders.length,
          paidCount: paidOrders.length,
          totalSpentYuan: (totalSpent / 100).toFixed(2),
        }
      })
    }

    // 用户列表
    const users = await getAllUsers({ limit: 100 })

    // 为每个用户附加统计信息
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const orders = await getOrdersByUserId(u._id)
        const paidOrders = orders.filter(o => o.status === 'paid')
        const totalSpent = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
        return {
          ...u,
          orderCount: orders.length,
          paidCount: paidOrders.length,
          totalSpentYuan: (totalSpent / 100).toFixed(2),
        }
      })
    )

    return Response.json({
      success: true,
      users: usersWithStats,
    })
  } catch (err) {
    console.error('Admin users error:', err)
    return Response.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}
