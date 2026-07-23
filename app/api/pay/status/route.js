import { queryOrder } from '@/lib/pay'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const outTradeNo = searchParams.get('out_trade_no')

  if (!outTradeNo) {
    return Response.json({ error: '缺少订单号' }, { status: 400 })
  }

  try {
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
    return Response.json({ error: '查询支付状态失败' }, { status: 500 })
  }
}
