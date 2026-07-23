'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function PayModal({ onClose, onSuccess }) {
  const [step, setStep] = useState('loading') // loading | qrcode | paid | error
  const [codeUrl, setCodeUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5分钟超时
  const pollingRef = useRef(null)
  const canvasRef = useRef(null)

  // 下单
  useEffect(() => {
    createOrder()
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  async function createOrder() {
    setStep('loading')
    setError('')
    try {
      const res = await fetch('/api/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 199 }), // 1.99元 = 199分
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '创建订单失败')

      setCodeUrl(data.code_url)
      setOrderNo(data.out_trade_no)

      // 生成二维码图片
      const qrUrl = await QRCode.toDataURL(data.code_url, {
        width: 220,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
      setQrDataUrl(qrUrl)
      setStep('qrcode')
      setTimeLeft(300)

      // 开始轮询支付状态
      pollingRef.current = setInterval(() => checkPayment(data.out_trade_no), 2000)
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }

  async function checkPayment(outTradeNo) {
    try {
      const res = await fetch(`/api/pay/status?out_trade_no=${outTradeNo}`)
      const data = await res.json()
      if (data.paid) {
        clearInterval(pollingRef.current)
        setStep('paid')
        setTimeout(() => onSuccess(), 1500)
      }
    } catch (err) {
      // 轮询失败继续
    }
  }

  // 超时倒计时
  useEffect(() => {
    if (step !== 'qrcode' || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(pollingRef.current)
          setError('二维码已过期，请重新发起支付')
          setStep('error')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, timeLeft])

  const PRIMARY = '#4263eb'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900">解锁使用</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: PRIMARY }} />
              <p className="text-sm text-gray-500">正在生成支付二维码...</p>
            </div>
          )}

          {step === 'qrcode' && (
            <div className="flex flex-col items-center">
              <div className="mb-3 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="3" fill="#07c160"/>
                  <path d="M6.5 8L9.5 11L13.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-lg font-bold text-gray-900">¥1.99</span>
              </div>

              {/* QR Code */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-3 mb-3">
                {qrDataUrl && <img src={qrDataUrl} alt="支付二维码" className="w-55 h-55" />}
              </div>

              <p className="text-sm text-gray-500 mb-1">请使用微信扫一扫</p>
              <p className="text-xs text-gray-400 mb-4">
                剩余有效时间 {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </p>

              <button
                onClick={createOrder}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                重新生成二维码
              </button>
            </div>
          )}

          {step === 'paid' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="14" fill="#07c160" fillOpacity="0.12"/>
                  <path d="M11 18L16 23L25 13" stroke="#07c160" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">支付成功！</h2>
              <p className="text-sm text-gray-500">感谢支持，正在解锁...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <span className="text-red-500 text-xl font-bold">!</span>
              </div>
              <p className="text-sm text-gray-600 text-center">{error}</p>
              <button
                onClick={createOrder}
                className="px-6 py-2.5 rounded-lg text-sm font-bold text-white hover:opacity-90"
                style={{ background: PRIMARY }}
              >
                重新发起支付
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
