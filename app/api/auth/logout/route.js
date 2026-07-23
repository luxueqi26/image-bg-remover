export async function POST(request) {
  const response = Response.json({ success: true })
  response.headers.set(
    'Set-Cookie',
    `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  )
  return response
}
