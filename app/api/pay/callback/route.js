import { verifyAndDecryptCallback } from '@/lib/pay'
import crypto from 'crypto'

/**
 * 微信支付回调通知
 * 验证签名 -> 解密数据 -> 记录支付成功
 */
export async function POST(request) {
  try {
    const signature = request.headers.get('wechatpay-signature')
    const timestamp = request.headers.get('wechatpay-timestamp')
    const nonce = request.headers.get('wechatpay-nonce')
    const serial = request.headers.get('wechatpay-serial')

    if (!signature || !timestamp || !nonce) {
      return new Response('Missing headers', { status: 400 })
    }

    const body = await request.json()

    // 验证签名并解密
    const decrypted = verifyAndDecryptCallback(
      signature,
      timestamp,
      nonce,
      body
    )

    const { out_trade_no, trade_state, transaction_id } = decrypted

    if (trade_state === 'SUCCESS') {
      // 记录支付成功
      if (!globalThis.__paidOrders) globalThis.__paidOrders = new Map()
      globalThis.__paidOrders.set(out_trade_no, {
        out_trade_no,
        transaction_id,
        paid_at: new Date().toISOString(),
      })
      console.log(`[Payment] Order ${out_trade_no} paid successfully, txn: ${transaction_id}`)
    }

    // 返回成功确认，微信会停止重复回调
    return new Response(JSON.stringify({ code: 'SUCCESS', message: 'OK' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Payment callback error:', err)
    return new Response(JSON.stringify({ code: 'FAIL', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
