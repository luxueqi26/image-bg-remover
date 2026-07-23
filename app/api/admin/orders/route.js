import { verifyAdminToken } from '@/lib/admin-auth'
import { getAllOrders } from '@/lib/db'

export async function GET(request) {
  const admin = verifyAdminToken(request)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = parseInt(searchParams.get('skip') || '0')

    const orders = await getAllOrders({ limit, skip })

    const ordersWithYuan = orders.map(o => ({
      ...o,
      amountYuan: (o.amount / 100).toFixed(2),
    }))

    return Response.json({
      success: true,
      orders: ordersWithYuan,
    })
  } catch (err) {
    console.error('Admin orders error:', err)
    return Response.json({ error: '获取订单列表失败' }, { status: 500 })
  }
}
