import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors, fonts } from '@oriweave/renderer'
import { MyConfigs } from '../components/MyConfigs'
import { useAuth } from '../context/AuthContext'
import { AppNav } from '../components/AppNav'

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
      <AppNav />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '28px 24px 60px',
        }}
      >
        <MyConfigs />
      </div>
    </div>
  )
}
