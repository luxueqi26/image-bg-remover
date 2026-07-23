import { getPricing } from '@/lib/db'

/**
 * 公开 API：获取套餐配置（前端用，不需要管理员权限）
 * GET /api/pricing
 */
export async function GET() {
  try {
    const pricing = await getPricing()
    return Response.json({
      success: true,
      single_price: pricing.single_price,
      single_price_yuan: (pricing.single_price / 100).toFixed(2),
      free_daily: pricing.free_daily,
    })
  } catch (err) {
    console.error('Get pricing error:', err)
    return Response.json({ error: '获取套餐配置失败' }, { status: 500 })
  }
}
