export async function POST(request) {
  const apiKey = process.env.REMOVEBG_API_KEY

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API Key 未配置' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('image_file')

    if (!file) {
      return new Response(
        JSON.stringify({ error: '未收到图片文件' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const bytes = await file.arrayBuffer()
    const removeBgFormData = new FormData()
    removeBgFormData.append('size', 'auto')
    removeBgFormData.append('image_file', new Blob([bytes], { type: file.type }), file.name)

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
