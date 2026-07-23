import { createUsageLog } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(request) {
  const apiKey = process.env.REMOVEBG_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API Key 未配置' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const startTime = Date.now()

  try {
    const formData = await request.formData()
    const file = formData.get('image_file')

    if (!file) {
      return new Response(
        JSON.stringify({ error: '未收到图片文件' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const fileName = file.name || 'unknown'
    const fileSize = file.size || 0

    // 获取当前登录用户
    let userId = ''
    let source = 'free'
    try {
      const user = await verifyToken(request)
      if (user) userId = user._id || user.user_id || ''
    } catch {}

    // 检查来源（从 header 读取）
    const sourceHeader = request.headers.get('x-usage-source')
    if (sourceHeader === 'paid') source = 'paid'

    const bytes = await file.arrayBuffer()
    const removeBgFormData = new FormData()
    removeBgFormData.append('size', 'auto')
    removeBgFormData.append('image_file', new Blob([bytes], { type: file.type }), fileName)

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: removeBgFormData,
    })

    if (!res.ok) {
      let message = `请求失败 (${res.status})`
      try {
        const err = await res.json()
        message = err?.errors?.[0]?.title || message
      } catch {}

      const statusMap = {
        402: 'API 额度已用完',
        403: 'API Key 无效',
        429: '请求过于频繁',
      }
      return new Response(
        JSON.stringify({ error: statusMap[res.status] || message }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const blob = await res.blob()
    const processingMs = Date.now() - startTime

    // 写入使用记录（不保存图片，只记录文件名和大小）
    try {
      await createUsageLog({
        user_id: userId,
        image_name: fileName,
        image_size: fileSize,
        source,
        processing_ms: processingMs,
      })
    } catch (err) {
      console.error('写入使用记录失败（不影响主流程）:', err)
    }

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="removed-bg.png"',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
