import { queryOrder } from '@/lib/pay'
import { getOrder } from '@/lib/db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const outTradeNo = searchParams.get('out_trade_no')

  if (!outTradeNo) {
    return Response.json({ error: '缺少订单号' }, { status: 400 })
  }

  try {
    // 优先查数据库
    const order = await getOrder(outTradeNo)
    if (order && order.status === 'paid') {
      return Response.json({
        success: true,
        paid: true,
        trade_state: 'SUCCESS',
      })
    }

    // 数据库没找到或未支付，查微信API
    const result = await queryOrder(outTradeNo)
    const isPaid = result.trade_state === 'SUCCESS'

    return Response.json({
      success: true,
      paid: isPaid,
      trade_state: result.trade_state,
      transaction_id: result.transaction_id,
    })
  } catch (err) {
    console.error('Query payment error:', err)

    // 查询API失败时，检查内存缓存（本地开发兼容）
    if (globalThis.__paidOrders && globalThis.__paidOrders.has(outTradeNo)) {
      return Response.json({
        success: true,
        paid: true,
        trade_state: 'SUCCESS',
      })
    }

    return Response.json({ error: '查询支付状态失败' }, { status: 500 })
  }
}
