import { createNativeOrder, generateOutTradeNo } from '@/lib/pay'

export async function POST(request) {
  try {
    const { amount } = await request.json()

    if (!amount || amount < 1) {
      return Response.json({ error: '金额无效' }, { status: 400 })
    }

    const orderNo = generateOutTradeNo()

    // 构建回调 URL
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const notifyUrl = `${protocol}://${host}/api/pay/callback`

    const result = await createNativeOrder({
      description: 'AI抠图 - 解锁使用',
      outTradeNo: orderNo,
      total: amount, // 单位：分
      notifyUrl,
    })

    return Response.json({
      success: true,
      code_url: result.code_url,
      out_trade_no: orderNo,
    })
  } catch (err) {
    console.error('Create payment error:', err)
    return Response.json({ error: err.message || '创建支付订单失败' }, { status: 500 })
  }
}
