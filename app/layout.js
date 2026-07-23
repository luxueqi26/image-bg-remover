import './globals.css'

export const metadata = {
  title: 'AI 抠图 - 在线图片背景去除',
  description: '免费在线 AI 抠图工具，一键去除图片背景，支持透明 PNG 导出',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        {children}
      </body>
    </html>
  )
}
