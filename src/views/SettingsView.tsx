import { useState } from 'react'
import {
  Moon,
  Sun,
  Download,
  User,
  Info,
  ExternalLink,
  Github,
  FolderOpen,
  Check,
  HardDrive,
  Trash2,
  X,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'

// Extend Window interface for Tauri
declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

export default function SettingsView() {
  const {
    darkMode,
    toggleDarkMode,
    downloadPath,
    setDownloadPath,
    downloadQuality,
    setDownloadQuality,
    cacheEnabled,
    toggleCacheEnabled,
    cachedSongs,
    clearCache,
    minimizeToTray,
    toggleMinimizeToTray,
  } = useAppStore()
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)

  const qualityOptions = [
    { value: 'normal', label: 'Normal', description: '128 kbps' },
    { value: 'high', label: 'High', description: '256 kbps' },
    { value: 'very_high', label: 'Very High', description: '320 kbps' },
  ] as const

  const currentQuality =
    qualityOptions.find((q) => q.value === downloadQuality) || qualityOptions[1]

  const handleSelectFolder = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        const selected = await invoke<string | null>('select_folder')
        if (selected) {
          setDownloadPath(selected)
        }
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error)
    }
  }

  const handleClearCache = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('clear_audio_cache')
      }
      clearCache()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  const openExternalLink = async (url: string) => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('open_url', { url })
      } else {
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Failed to open link:', error)
      // Fallback
      window.open(url, '_blank')
    }
  }

  const settingGroups = [
    {
      title: 'Appearance',
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: 'Dark Mode',
          description: 'Switch between light and dark themes',
          action: (
            <button
              onClick={toggleDarkMode}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${darkMode ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${darkMode ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Behavior',
      items: [
        {
          icon: X,
          label: 'Close to Tray',
          description: minimizeToTray ? 'Minimize to system tray on close' : 'Exit app on close',
          action: (
            <button
              onClick={toggleMinimizeToTray}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${minimizeToTray ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${minimizeToTray ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Playback',
      items: [
        {
          icon: HardDrive,
          label: 'Cache Music',
          description: `Cache up to 40 songs for offline playback (${cachedSongs.length}/40)`,
          action: (
            <button
              onClick={toggleCacheEnabled}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${cacheEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${cacheEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: Trash2,
          label: 'Clear Cache',
          description: cachedSongs.length > 0 ? `${cachedSongs.length} songs cached` : 'No songs cached',
          action: (
            <button 
              onClick={handleClearCache}
              disabled={cachedSongs.length === 0}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ios-active
                ${cachedSongs.length > 0 
                  ? 'bg-ios-red text-white' 
                  : darkMode ? 'bg-ios-card-secondary-dark text-ios-gray' : 'bg-ios-card-secondary text-ios-gray'}`}
            >
              Clear
            </button>
          )
        }
      ]
    },
    {
      title: 'Downloads',
      items: [
        {
          icon: FolderOpen,
          label: 'Download Location',
          description: downloadPath || 'Default: Music/VYRA',
          action: (
            <button 
              onClick={handleSelectFolder}
              className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active"
            >
              Browse
            </button>
          )
        },
        {
          icon: Download,
          label: 'Download Quality',
          description: 'Quality for offline downloads',
          action: (
            <div className="relative">
              <button 
                onClick={() => setShowQualityDropdown(!showQualityDropdown)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 min-w-[100px] justify-between
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                {currentQuality.label}
                <svg className={`w-4 h-4 ios-transition ${showQualityDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showQualityDropdown && (
                <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]
                  ${darkMode ? 'bg-ios-card-dark border border-white/10' : 'bg-white border border-black/10'}`}>
                  {qualityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDownloadQuality(option.value)
                        setShowQualityDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between
                        ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}
                        ${downloadQuality === option.value ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-ios-gray">{option.description}</p>
                      </div>
                      {downloadQuality === option.value && <Check size={16} className="text-ios-blue" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'YouTube Music Account',
          description: 'Sign-in coming soon',
          action: (
            <button 
              disabled
              className="px-3 py-1.5 bg-ios-gray/30 text-ios-gray rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          )
        }
      ]
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'Version',
          description: 'VYRA v1.0.0',
          action: null
        },
        {
          icon: Github,
          label: 'Open Source',
          description: 'View on GitHub',
          action: (
            <button 
              onClick={() => openExternalLink('https://github.com/HasibulHasan098/VYRA-MUSIC')}
              className="flex items-center gap-1 text-ios-blue text-sm font-medium ios-active"
            >
              Open <ExternalLink size={13} />
            </button>
          )
        }
      ]
    }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
        Settings
      </h1>

      {settingGroups.map((group) => (
        <section key={group.title}>
          <h2 className="text-sm font-semibold text-ios-gray uppercase tracking-wider mb-2 px-3">
            {group.title}
          </h2>
          <div className={`rounded-xl ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
            {group.items.map((item, index) => (
              <div 
                key={item.label}
                className={`flex items-center gap-3 px-4 py-3
                  ${index > 0 ? `border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}` : ''}
                  ${index === 0 ? 'rounded-t-xl' : ''} 
                  ${index === group.items.length - 1 ? 'rounded-b-xl' : ''}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                  ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                  <item.icon size={18} className="text-ios-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-ios-gray truncate">{item.description}</p>
                </div>
                {item.action}
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Credits */}
      <section className={`rounded-xl p-5 text-center ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
        <p className="text-sm text-ios-gray">
          MADE BY FASTHAND
        </p>
      </section>
    </div>
  )
}
