import { createNativeOrder, generateOutTradeNo } from '@/lib/pay'
import { createOrder, getPricing } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(request) {
  try {
    // 从 pricing 表读取价格（后台可改）
    const pricing = await getPricing()
    const amount = pricing.single_price

    const orderNo = generateOutTradeNo()

    // 获取当前登录用户（可选，未登录也允许支付）
    let userId = ''
    try {
      const user = await verifyToken(request)
      if (user) userId = user._id || user.user_id || ''
    } catch {}

    // 写入订单表
    await createOrder({
      user_id: userId,
      out_trade_no: orderNo,
      amount,
      pay_method: 'wechat',
    })

    // 构建回调 URL
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const notifyUrl = `${protocol}://${host}/api/pay/callback`

    const result = await createNativeOrder({
      description: 'AI抠图 - 解锁使用',
      outTradeNo: orderNo,
      total: amount,
      notifyUrl,
    })

    return Response.json({
      success: true,
      code_url: result.code_url,
      out_trade_no: orderNo,
      amount_yuan: (amount / 100).toFixed(2),
    })
  } catch (err) {
    console.error('Create payment error:', err)
    return Response.json({ error: err.message || '创建支付订单失败' }, { status: 500 })
  }
}
