'use client'

import { useState, useEffect } from 'react'

export default function LoginModal({ onClose, onSuccess }) {
  const [tab, setTab] = useState('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [wechatHover, setWechatHover] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  async function sendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '发送失败')
      }
      setCountdown(60)
      if (data.dev_code) {
        setDevCode(data.dev_code)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function verifyLogin() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setError('请输入6位验证码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '登录失败')
      }
      onSuccess(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function wechatLogin() {
    const currentUrl = window.location.origin + '/api/auth/wechat/callback'
    const redirectUri = encodeURIComponent(currentUrl)
    window.location.href = `/api/auth/wechat?redirect_uri=${redirectUri}`
  }

  const PRIMARY = '#4263eb'
  const WECHAT_GREEN = '#07c160'

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
          <h2 className="text-lg font-bold text-gray-900">登录 / 注册</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          <button
            className={`pb-3 px-1 mr-6 text-sm font-bold transition-colors ${
              tab === 'phone' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'
            }`}
            onClick={() => { setTab('phone'); setError('') }}
          >
            手机号登录
          </button>
          <button
            className={`pb-3 px-1 text-sm font-bold transition-colors ${
              tab === 'wechat' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400'
            }`}
            onClick={() => { setTab('wechat'); setError('') }}
          >
            微信登录
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'phone' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">手机号</label>
                <input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  maxLength={11}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">验证码</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    maxLength={6}
                    onKeyDown={(e) => e.key === 'Enter' && verifyLogin()}
                  />
                  <button
                    onClick={sendCode}
                    disabled={countdown > 0 || sending || phone.length !== 11}
                    className="px-4 py-3 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    style={{ minWidth: 110 }}
                  >
                    {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              {devCode && (
                <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                  开发模式验证码：<strong>{devCode}</strong>
                </div>
              )}

              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={verifyLogin}
                disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: PRIMARY }}
              >
                {loading ? '登录中...' : '登录 / 注册'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                未注册的手机号将自动创建账号
              </p>
            </div>
          )}

          {tab === 'wechat' && (
            <div className="flex flex-col items-center py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4 cursor-pointer transition-transform hover:scale-105"
                style={{ background: WECHAT_GREEN }}
                onClick={wechatLogin}
                onMouseEnter={() => setWechatHover(true)}
                onMouseLeave={() => setWechatHover(false)}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path
                    d="M13.5 6C8.25 6 4 9.35 4 13.5c0 2.3 1.25 4.35 3.2 5.75L6.5 21l2.8-1.4c1.05.3 2.15.45 3.2.45.3 0 .6 0 .9-.05-.2-.6-.3-1.25-.3-1.9 0-3.9 3.55-7 8-7 .3 0 .6 0 .9.05C21.6 8 18 6 13.5 6z"
                    fill="white"
                  />
                  <path
                    d="M26 13c-4.4 0-8 2.9-8 6.5s3.6 6.5 8 6.5c.85 0 1.65-.1 2.4-.3l2.3 1.15-.6-2c1.5-1.15 2.4-2.85 2.4-4.85 0-3.6-3.6-6.5-8-6.5z"
                    fill="white"
                  />
                  <circle cx="10.5" cy="11.5" r="1.2" fill={WECHAT_GREEN} />
                  <circle cx="16.5" cy="11.5" r="1.2" fill={WECHAT_GREEN} />
                  <circle cx="23" cy="18" r="1" fill={WECHAT_GREEN} />
                  <circle cx="29" cy="18" r="1" fill={WECHAT_GREEN} />
                </svg>
              </div>
              <p className="text-sm text-gray-500 mb-2">点击图标，使用微信扫码登录</p>
              <p className="text-xs text-gray-400 mb-6">
                {wechatHover ? '即将跳转到微信授权页面' : '打开微信扫一扫即可登录'}
              </p>

              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-3">
                  {error}
                </div>
              )}

              <div className="w-full pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  扫码登录需在微信开放平台注册网站应用<br/>
                  <a
                    href="https://open.weixin.qq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    前往微信开放平台注册 →
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
