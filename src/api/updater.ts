// Update checker for VYRA Music
// Checks GitHub releases for new versions

const GITHUB_REPO = 'HasibulHasan098/VYRA-MUSIC'
const CURRENT_VERSION = '1.0.2'

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

// Fetch latest release from GitHub
export async function checkForUpdates(): Promise<ReleaseInfo | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    
    if (!response.ok) {
      // Try to get any release if latest doesn't exist
      const releasesResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )
      
      if (!releasesResponse.ok) {
        console.error('Failed to fetch releases')
        return null
      }
      
      const releases = await releasesResponse.json()
      if (!releases || releases.length === 0) {
        return null
      }
      
      // Get the first (latest) release
      const release = releases[0]
      return parseRelease(release)
    }
    
    const release = await response.json()
    return parseRelease(release)
  } catch (error) {
    console.error('Failed to check for updates:', error)
    return null
  }
}

function parseRelease(release: any): ReleaseInfo {
  // Find Windows exe asset
  const exeAsset = release.assets?.find((asset: any) => 
    asset.name.endsWith('.exe') || 
    asset.name.endsWith('.msi') ||
    asset.name.includes('windows')
  )
  
  return {
    version: release.tag_name?.replace(/^v/, '') || release.name || '0.0.0',
    tagName: release.tag_name || '',
    name: release.name || 'New Release',
    body: release.body || '',
    publishedAt: release.published_at || '',
    downloadUrl: exeAsset?.browser_download_url || null,
    htmlUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases`
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
