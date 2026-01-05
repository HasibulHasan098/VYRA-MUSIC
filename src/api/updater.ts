// Update checker for VYRA Music
// Checks GitHub releases for new versions via Tauri backend

import { invoke } from '@tauri-apps/api/core'

const GITHUB_REPO = 'HasibulHasan098/VYRA-MUSIC'
const CURRENT_VERSION = '1.0.8'

export interface ReleaseInfo {
  version: string
  tagName: string
  name: string
  body: string
  publishedAt: string
  downloadUrl: string | null
  htmlUrl: string
}

// Compare version strings (e.g., "1.0.0" vs "1.0.1")
export function compareVersions(current: string, latest: string): number {
  const currentParts = current.replace(/^v/, '').split('.').map(Number)
  const latestParts = latest.replace(/^v/, '').split('.').map(Number)
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const a = currentParts[i] || 0
    const b = latestParts[i] || 0
    if (a < b) return -1
    if (a > b) return 1
  }
  return 0
}

// Check if running in Tauri
const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window

// Fetch latest release from GitHub (via Tauri backend to avoid CORS/rate limiting)
export async function checkForUpdates(): Promise<ReleaseInfo | null> {
  try {
    if (isTauri()) {
      // Use Tauri backend to fetch releases
      const release = await invoke<any>('check_for_updates')
      return parseRelease(release)
    }
    
    // Fallback for browser (won't work due to CORS, but kept for completeness)
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    
    if (response.ok) {
      const release = await response.json()
      return parseRelease(release)
    }
    
    return null
  } catch (error) {
    console.error('Failed to check for updates:', error)
    return null
  }
}

function parseRelease(release: any): ReleaseInfo {
  // Find Windows installer asset (prefer exe setup, then msi)
  const assets = release.assets || []
  
  // Look for setup exe first
  let downloadAsset = assets.find((asset: any) => 
    asset.name.toLowerCase().includes('setup') && asset.name.endsWith('.exe')
  )
  
  // Then try any exe
  if (!downloadAsset) {
    downloadAsset = assets.find((asset: any) => asset.name.endsWith('.exe'))
  }
  
  // Then try msi
  if (!downloadAsset) {
    downloadAsset = assets.find((asset: any) => asset.name.endsWith('.msi'))
  }
  
  // Get version from tag_name (handles both "v1.0.2" and "1.0.2" formats)
  const tagName = release.tag_name || ''
  const version = tagName.replace(/^v/, '') || release.name?.replace(/^v/, '') || '0.0.0'
  
  return {
    version,
    tagName,
    name: release.name || `Version ${version}`,
    body: release.body || '',
    publishedAt: release.published_at || '',
    downloadUrl: downloadAsset?.browser_download_url || null,
    htmlUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/tag/${tagName}`
  }
}

// Check if update is available
export async function isUpdateAvailable(): Promise<{ available: boolean; release: ReleaseInfo | null }> {
  const release = await checkForUpdates()
  
  if (!release) {
    return { available: false, release: null }
  }
  
  const comparison = compareVersions(CURRENT_VERSION, release.version)
  return {
    available: comparison < 0,
    release
  }
}

// Get current app version
export function getCurrentVersion(): string {
  return CURRENT_VERSION
}

// Download and install update (Tauri-specific)
export async function downloadAndInstallUpdate(downloadUrl: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // Download the update file
      await invoke('download_and_install_update', { url: downloadUrl })
      return true
    }
    
    // Fallback: open download URL in browser
    window.open(downloadUrl, '_blank')
    return true
  } catch (error) {
    console.error('Failed to download update:', error)
    return false
  }
}

// Open releases page in browser
export async function openReleasesPage(): Promise<void> {
  const url = `https://github.com/${GITHUB_REPO}/releases`
  
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('open_url', { url })
    } else {
      window.open(url, '_blank')
    }
  } catch {
    window.open(url, '_blank')
  }
}
