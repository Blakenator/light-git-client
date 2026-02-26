import { defineConfig } from 'vitepress';
import path from 'node:path';

const docsPackageRoot = path.resolve(__dirname, '../../packages/docs');

export default defineConfig({
  title: 'Light Git Client',
  description: 'A lightweight, feature-rich Git GUI built with Electron',
  base: '/light-git-client/',

  head: [['link', { rel: 'icon', href: '/light-git-client/favicon.ico' }]],

  vite: {
    resolve: {
      alias: {
        vue: path.resolve(docsPackageRoot, 'node_modules/vue'),
      },
    },
  },

  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started/installation' },
      { text: 'Features', link: '/features/branching' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Quick Start', link: '/getting-started/quick-start' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Branching', link: '/features/branching' },
          { text: 'Staging', link: '/features/staging' },
          { text: 'Committing', link: '/features/committing' },
          { text: 'Diff Viewer', link: '/features/diff-viewer' },
          { text: 'Commit History', link: '/features/commit-history' },
          { text: 'Merge & Rebase', link: '/features/merge-rebase' },
          { text: 'Stashes', link: '/features/stashes' },
          { text: 'Worktrees', link: '/features/worktrees' },
          { text: 'Submodules', link: '/features/submodules' },
          { text: 'Code Watchers', link: '/features/code-watchers' },
          { text: 'Command History', link: '/features/command-history' },
          { text: 'Tabs', link: '/features/tabs' },
          { text: 'Prune Branches', link: '/features/prune-branches' },
          { text: 'Settings', link: '/features/settings' },
          { text: 'Customizing Layout', link: '/features/customizing-layout' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Blakenator/light-git-client' },
    ],

    search: {
      provider: 'local',
    },
  },
});
