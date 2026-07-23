import { verifyAdminToken } from '@/lib/admin-auth'
import { getPricing, updatePricing } from '@/lib/db'

export async function GET(request) {
  // 管理后台获取套餐配置（需要管理员权限）
  const admin = verifyAdminToken(request)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const pricing = await getPricing()
    return Response.json({
      success: true,
      pricing: {
        ...pricing,
        single_price_yuan: (pricing.single_price / 100).toFixed(2),
      }
    })
  } catch (err) {
    console.error('Get pricing error:', err)
    return Response.json({ error: '获取套餐配置失败' }, { status: 500 })
  }
}

export async function PUT(request) {
  const admin = verifyAdminToken(request)
  if (!admin) {
    return Response.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { single_price, free_daily } = await request.json()

    const updates = {}
    if (single_price !== undefined) {
      // 前端传的是元，转成分
      updates.single_price = Math.round(parseFloat(single_price) * 100)
    }
    if (free_daily !== undefined) {
      updates.free_daily = parseInt(free_daily)
    }

    const pricing = await updatePricing(updates)

    return Response.json({
      success: true,
      pricing: {
        ...pricing,
        single_price_yuan: (pricing.single_price / 100).toFixed(2),
      }
    })
  } catch (err) {
    console.error('Update pricing error:', err)
    return Response.json({ error: '修改套餐配置失败' }, { status: 500 })
  }
}
