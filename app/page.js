'use client'

import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [step, setStep] = useState('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [originalUrl, setOriginalUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [originalUrl, resultUrl])

  function processFile(file) {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('请上传图片文件（JPG / PNG / WebP）')
      setStep('error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('图片大小不能超过 10MB')
      setStep('error')
      return
    }
    setOriginalUrl(URL.createObjectURL(file))
    setStep('processing')
    callRemoveBg(file)
  }

  async function callRemoveBg(file) {
    const formData = new FormData()
    formData.append('image_file', file)
    try {
      const res = await fetch('/api/remove-bg', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `请求失败 (${res.status})`)
      }
      const blob = await res.blob()
      setResultUrl(URL.createObjectURL(blob))
      setStep('result')
    } catch (err) {
      setErrorMessage(err.message || '网络错误')
      setStep('error')
    }
  }

  function downloadResult() {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `removed-bg-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function reset() {
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setStep('upload')
    setIsDragging(false)
    setOriginalUrl('')
    setResultUrl('')
    setErrorMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const PRIMARY = '#4263eb'

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="24" height="24" rx="6" fill={PRIMARY}/>
              <path d="M9 14.5L12.5 18L19 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xl font-bold text-gray-900">AI 抠图</span>
          </div>
          <p className="text-sm text-gray-400">一键去除图片背景</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        {step === 'upload' && (
          <div className="flex flex-col items-center">
            {/* Upload zone */}
            <div
              className="w-full max-w-xl flex flex-col items-center justify-center gap-2 cursor-pointer rounded-2xl p-12"
              style={{
                minHeight: 320,
                border: isDragging ? `2px dashed ${PRIMARY}` : '2px dashed #c5cae9',
                background: isDragging ? '#edf2ff' : '#fff',
                transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: 8 }}>
                <rect x="6" y="6" width="52" height="52" rx="12" fill="#edf2ff" stroke={PRIMARY} strokeWidth="1.5" strokeDasharray="6 4"/>
                <path d="M32 22V42M32 22L24 30M32 22L40 30" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h2 className="text-xl font-bold text-gray-900">拖拽图片到这里</h2>
              <p className="text-sm text-gray-500">或点击选择文件</p>
              <p className="text-xs text-gray-400 mt-1">支持 JPG / PNG / WebP，最大 10MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) processFile(f) }} />

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 mt-16 w-full max-w-xl">
              {[
                { title: '一键上传', desc: '拖拽或点击即可上传图片', c: '#4263eb' },
                { title: 'AI 自动处理', desc: '智能识别前景，精准去背景', c: '#2f9e44' },
                { title: '免费下载', desc: '导出透明背景 PNG', c: '#4263eb' },
              ].map((item, i) => (
                <div key={i} className="text-center p-6 rounded-xl bg-white border border-gray-200">
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
                    {i === 0 && (
                      <>
                        <path d="M16 4L26 14L22 14L22 28L10 28L10 14L6 14L16 4Z" fill={item.c} fillOpacity="0.12"/>
                        <path d="M16 4L26 14L22 14L22 28L10 28L10 14L6 14L16 4Z" stroke={item.c} strokeWidth="1.5" strokeLinejoin="round"/>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <circle cx="16" cy="16" r="12" fill={item.c} fillOpacity="0.12"/>
                        <path d="M11 16L15 20L21 12" stroke={item.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    )}
                    {i === 2 && (
                      <>
                        <rect x="5" y="8" width="22" height="17" rx="3" fill={item.c} fillOpacity="0.12"/>
                        <rect x="5" y="8" width="22" height="17" rx="3" stroke={item.c} strokeWidth="1.5"/>
                        <path d="M13 19L16 22L19 19" stroke={item.c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </>
                    )}
                  </svg>
                  <h3 className="text-sm font-bold mb-1 text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: PRIMARY }} />
            <h2 className="text-xl font-bold text-gray-900">正在抠图...</h2>
            <p className="text-sm text-gray-500">AI 正在处理你的图片，请稍候</p>
            {originalUrl && (
              <div className="mt-4 w-48 rounded-lg overflow-hidden border border-gray-200">
                <img src={originalUrl} alt="原始" className="w-full" />
              </div>
            )}
          </div>
        )}

        {step === 'result' && (
          <div className="w-full flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-2 text-center">原图</h3>
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                  <img src={originalUrl} alt="原图" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-2 text-center">抠图结果</h3>
                <div className="rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center" style={{
                  aspectRatio: '4/3',
                  backgroundImage: 'linear-gradient(45deg, #e9ecef 25%, transparent 25%), linear-gradient(-45deg, #e9ecef 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e9ecef 75%), linear-gradient(-45deg, transparent 75%, #e9ecef 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}>
                  <img src={resultUrl} alt="结果" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={downloadResult} className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: PRIMARY }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2V12M9 12L5 8M9 12L13 8M3 15H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                下载 PNG
              </button>
              <button onClick={reset} className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                再处理一张
              </button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <span className="text-red-500 text-2xl font-bold">!</span>
            </div>
            <h2 className="text-xl font-bold text-red-600">处理失败</h2>
            <p className="text-sm text-gray-500 max-w-sm">{errorMessage}</p>
            <button onClick={reset} className="mt-4 px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              重新上传
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-300 border-t border-gray-100">
        图片仅在服务器内存中处理，不会持久化存储
      </footer>
    </div>
  )
}
