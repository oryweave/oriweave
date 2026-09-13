import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MyConfigs } from '../components/MyConfigs'
import { useAuth } from '../context/AuthContext'
import { AppNav } from '../components/AppNav'

const colors = {
  background: '#0D1117',
  textMuted: '#6E7681',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

export const MyConfigsPage: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [isLoading, isLoggedIn, navigate])

  if (isLoading || !isLoggedIn) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: colors.background,
          color: colors.textMuted,
          fontFamily: fonts.mono,
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        fontFamily: fonts.mono,
      }}
    >
      <AppNav title="MY CONFIGS" />

      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: 24,
        }}
      >
        <MyConfigs />
      </div>
    </div>
  )
}
