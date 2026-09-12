import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'Oriweave',
  tagline: 'Document your homelab as YAML. Render it as a live topology.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.oriweave.dev',
  baseUrl: '/',

  organizationName: 'oryweave',
  projectName: 'oriweave',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'concepts',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/oryweave/oriweave/tree/develop/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Oriweave',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://oriweave.dev',
          label: 'Live app',
          position: 'right',
        },
        {
          href: 'https://github.com/oryweave/oriweave',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Installation & Development', to: '/installation' },
            { label: 'Schema Reference', to: '/schema-reference' },
            { label: 'Architecture', to: '/architecture' },
            { label: 'Configuration', to: '/configuration' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Live app', href: 'https://oriweave.dev' },
            { label: 'GitHub', href: 'https://github.com/oryweave/oriweave' },
            { label: 'Issues', href: 'https://github.com/oryweave/oriweave/issues' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Desmond Edem. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
