import { verifyAdminToken } from '@/lib/admin-auth'
import { countUsers, countOrders, sumPaidAmountByDate, getUsageCountByDate } from '@/lib/db'

export async function GET(request) {
  const admin = verifyAdminToken(request)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const today = new Date().toISOString().slice(0, 10)

    const [totalUsers, totalOrders, paidOrders, todayUsage, todayRevenue] = await Promise.all([
      countUsers(),
      countOrders(),
      countOrders('paid'),
      getUsageCountByDate(today),
      sumPaidAmountByDate(today),
    ])

    return Response.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        paidOrders,
        todayUsage,
        todayRevenue,     // 单位：分
        todayRevenueYuan: (todayRevenue / 100).toFixed(2),
      }
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return Response.json({ error: '获取统计数据失败' }, { status: 500 })
  }
}
