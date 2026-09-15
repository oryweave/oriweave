import { BrowserRouter, Routes, Route, useLocation, useParams, useNavigate } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { colors, fonts } from '@oriweave/renderer'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EditorPage } from './pages/EditorPage'
import { fetchConfig } from './lib/api'
import { GalleryPage } from './pages/GalleryPage'
import { LandingPage } from './pages/LandingPage'
import { MyConfigsPage } from './pages/MyConfigsPage'
import { SharedView } from './pages/SharedViewPage'
import { TemplatesPage } from './pages/TemplatesPage'

const FullScreenMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    {children}
  </div>
)

const EditorWithState: React.FC = () => {
  const location = useLocation()
  const state = location.state as { yaml?: string } | null
  return <EditorPage initialYaml={state?.yaml} />
}

const EditOwnConfig: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()

  const [yaml, setYaml] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('unlisted')
  const [error, setError] = useState<string | null>(null)
  const [authorChecked, setAuthorChecked] = useState(false)

  useEffect(() => {
    // Wait for auth to resolve before checking ownership.
    if (!slug || isLoading) return

    let cancelled = false
    fetchConfig(slug)
      .then((config) => {
        if (cancelled) return
        const isOwner = Boolean(user && config.author && config.author.username === user.username)
        if (!isOwner) {
          // Bounce to shared view; user can fork from there if they want.
          navigate(`/s/${slug}`, { replace: true })
          return
        }
        setYaml(config.yaml)
        setVisibility(config.visibility === 'public' ? 'public' : 'unlisted')
        setAuthorChecked(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load config')
      })

    return () => {
      cancelled = true
    }
  }, [slug, user, isLoading, navigate])

  if (error) {
    return <FullScreenMessage>{error}</FullScreenMessage>
  }

  if (!authorChecked || yaml === null) {
    return <FullScreenMessage>Loading config...</FullScreenMessage>
  }

  return <EditorPage initialYaml={yaml} editingSlug={slug} initialVisibility={visibility} />
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/editor" element={<EditorWithState />} />
          <Route path="/s/:slug" element={<SharedView />} />
          <Route path="/edit/:slug" element={<EditOwnConfig />} />
          <Route path="/my-configs" element={<MyConfigsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
