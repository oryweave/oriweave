import React from 'react'
import { colors, fonts } from '@oriweave/renderer'
import { MyConfigs } from '../components/MyConfigs'
import { useAuth } from '../context/AuthContext'
import { AppNav } from '../components/AppNav'

export const MyConfigsPage: React.FC = () => {
  const { isLoggedIn, isLoading, login } = useAuth()

  if (isLoading) {
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

  if (!isLoggedIn) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          height: '100vh',
          background: colors.background,
          color: colors.textMuted,
          fontFamily: fonts.mono,
          fontSize: 13,
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div>Sign in to view your configs.</div>
        <button
          onClick={login}
          style={{
            padding: '8px 20px',
            background: colors.primary,
            border: 'none',
            borderRadius: 6,
            color: colors.background,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          SIGN IN
        </button>
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
