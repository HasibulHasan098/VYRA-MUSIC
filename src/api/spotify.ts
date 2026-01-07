// Spotify Import API - Fetches playlist/album data from public Spotify URLs

import { Song } from './youtube'

export interface SpotifyTrack {
  name: string
  artists: string[]
  album?: string
  duration?: number
}

export interface SpotifyImportResult {
  name: string
  description?: string
  tracks: SpotifyTrack[]
  thumbnail?: string
  type: 'playlist' | 'album'
}

// Extract Spotify ID from various URL formats
export function parseSpotifyUrl(url: string): { type: 'playlist' | 'album' | 'track' | null; id: string | null } {
  const cleanUrl = url.split('?')[0].split('#')[0]
  
  const patterns = [
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/album\/([a-zA-Z0-9]+)/,
    /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
    /spotify:playlist:([a-zA-Z0-9]+)/,
    /spotify:album:([a-zA-Z0-9]+)/,
    /spotify:track:([a-zA-Z0-9]+)/,
  ]

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern) || url.match(pattern)
    if (match) {
      const id = match[1]
      if (pattern.source.includes('playlist')) return { type: 'playlist', id }
      if (pattern.source.includes('album')) return { type: 'album', id }
      if (pattern.source.includes('track')) return { type: 'track', id }
    }
  }

  return { type: null, id: null }
}

// Fetch playlist/album data
export async function fetchSpotifyData(
  url: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<SpotifyImportResult> {
  const { type, id } = parseSpotifyUrl(url)
  
  if (!type || !id) {
    throw new Error('Invalid Spotify URL. Please use a playlist, album, or track link.')
  }

  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    throw new Error('Spotify import requires the desktop app')
  }

  const { invoke } = await import('@tauri-apps/api/core')

  // Try oEmbed first to get basic info (most reliable)
  onProgress?.('Connecting to Spotify...', 10)
  
  let playlistName = 'Imported Playlist'
  let thumbnail: string | undefined
  
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/${type}/${id}`
    const oembedResponse = await invoke<string>('fetch_url', { url: oembedUrl })
    const oembedData = JSON.parse(oembedResponse)
    
    if (oembedData.title) playlistName = oembedData.title
    if (oembedData.thumbnail_url) thumbnail = oembedData.thumbnail_url
    
    onProgress?.('Got playlist info...', 30)
  } catch {
    // oEmbed failed, continue with other methods
  }

  // Now try to get the track list
  const methods = [
    () => fetchViaEmbedApi(invoke, type, id, onProgress),
    () => fetchViaEmbed(invoke, type, id, onProgress),
  ]

  let lastError: Error | null = null

  for (const method of methods) {
    try {
      const result = await method()
      if (result && result.tracks.length > 0) {
        // Use oEmbed data if we got it
        if (playlistName !== 'Imported Playlist') result.name = playlistName
        if (thumbnail && !result.thumbnail) result.thumbnail = thumbnail
        return result
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError || new Error('Failed to fetch Spotify data. Make sure the playlist/album is public.')
}

// Method 1: Use Spotify's embed API endpoint (returns JSON)
async function fetchViaEmbedApi(
  invoke: (cmd: string, args: Record<string, unknown>) => Promise<string>,
  type: string,
  id: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<SpotifyImportResult> {
  onProgress?.('Fetching track list...', 50)
  
  const embedHtmlUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`
  const html = await invoke('fetch_url', { url: embedHtmlUrl })
  
  onProgress?.('Parsing tracks...', 70)
  
  return parseSpotifyEmbed(html, type as 'playlist' | 'album')
}

// Method 2: Direct embed page scraping (fallback)
async function fetchViaEmbed(
  invoke: (cmd: string, args: Record<string, unknown>) => Promise<string>,
  type: string,
  id: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<SpotifyImportResult> {
  onProgress?.('Fetching embed page...', 40)
  
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`
  const html = await invoke('fetch_url', { url: embedUrl })
  
  onProgress?.('Parsing data...', 70)
  
  return parseSpotifyEmbed(html, type as 'playlist' | 'album')
}

// Parse Spotify embed HTML - try multiple data sources
function parseSpotifyEmbed(html: string, type: 'playlist' | 'album'): SpotifyImportResult {
  const tracks: SpotifyTrack[] = []
  let name = 'Imported Playlist'
  let description: string | undefined
  let thumbnail: string | undefined

  // Method 1: Try to find resourceState in script
  const resourceMatch = html.match(/Spotify\.Entity\s*=\s*({[\s\S]*?});/)
  if (resourceMatch) {
    try {
      const data = JSON.parse(resourceMatch[1])
      return parseEntityData(data, type)
    } catch {
      // Failed to parse, try next method
    }
  }

  // Method 2: Try __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1])
      
      // Try different paths in the data structure
      const paths = [
        data?.props?.pageProps?.state?.data?.entity,
        data?.props?.pageProps?.data?.entity,
        data?.props?.pageProps?.entity,
        data?.props?.pageProps,
      ]
      
      for (const entity of paths) {
        if (entity) {
          const result = parseEntityData(entity, type)
          if (result.tracks.length > 0) {
            return result
          }
        }
      }
    } catch {
      // Failed to parse, try next method
    }
  }

  // Method 3: Try to find JSON in script tags
  const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)
  for (const match of scriptMatches) {
    const content = match[1]
    if (content.includes('"trackList"') || content.includes('"tracks"')) {
      try {
        // Try to extract JSON object
        const jsonMatch = content.match(/(\{[\s\S]*"(?:trackList|tracks)"[\s\S]*\})/)
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1])
          const result = parseEntityData(data, type)
          if (result.tracks.length > 0) {
            return result
          }
        }
      } catch (e) {
        // Continue trying
      }
    }
  }

  // Method 4: Parse from meta tags and visible content
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
  if (titleMatch) name = decodeHtmlEntities(titleMatch[1])
  
  const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
  if (descMatch) description = decodeHtmlEntities(descMatch[1])
  
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
  if (imageMatch) thumbnail = imageMatch[1]

  // Try to extract track names from the HTML structure
  // Look for track rows in the embed
  const trackRowPattern = /<div[^>]*data-testid="tracklist-row"[^>]*>[\s\S]*?<span[^>]*dir="auto"[^>]*>([^<]+)<\/span>/g
  let trackMatch
  while ((trackMatch = trackRowPattern.exec(html)) !== null) {
    const trackName = decodeHtmlEntities(trackMatch[1].trim())
    if (trackName && trackName.length > 1) {
      tracks.push({
        name: trackName,
        artists: ['Unknown Artist']
      })
    }
  }

  // Alternative: look for any track-like patterns
  if (tracks.length === 0) {
    const altPattern = /"name"\s*:\s*"([^"]+)"[^}]*"artists"/g
    let altMatch
    while ((altMatch = altPattern.exec(html)) !== null) {
      const trackName = decodeHtmlEntities(altMatch[1])
      if (trackName && !tracks.some(t => t.name === trackName)) {
        tracks.push({
          name: trackName,
          artists: ['Unknown Artist']
        })
      }
    }
  }

  if (tracks.length === 0) {
    throw new Error('No tracks found. The playlist might be empty or private.')
  }

  return { name, description, tracks, thumbnail, type }
}

// Parse entity data from various Spotify JSON structures
function parseEntityData(entity: any, type: 'playlist' | 'album'): SpotifyImportResult {
  const tracks: SpotifyTrack[] = []
  let name = entity.name || entity.title || 'Imported Playlist'
  let description = entity.description
  let thumbnail: string | undefined

  // Get thumbnail from various possible locations
  const images = entity.images?.items || entity.images || entity.coverArt?.sources || entity.coverArt
  if (Array.isArray(images) && images.length > 0) {
    thumbnail = images[0].url || images[0]
  } else if (typeof images === 'string') {
    thumbnail = images
  }

  // Get tracks from various possible locations
  const trackSources = [
    entity.trackList,
    entity.tracks?.items,
    entity.tracks,
    entity.items,
  ]

  for (const source of trackSources) {
    if (Array.isArray(source) && source.length > 0) {
      for (const item of source) {
        const track = item.track || item
        if (track && (track.name || track.title)) {
          const artistsData = track.artists?.items || track.artists || []
          const artists = artistsData.map((a: any) => 
            a.profile?.name || a.name || a
          ).filter((a: any) => typeof a === 'string' && a.length > 0)

          tracks.push({
            name: track.name || track.title,
            artists: artists.length > 0 ? artists : ['Unknown Artist'],
            album: track.albumOfTrack?.name || track.album?.name || track.album,
            duration: track.duration?.totalMilliseconds 
              ? Math.floor(track.duration.totalMilliseconds / 1000)
              : track.duration_ms
                ? Math.floor(track.duration_ms / 1000)
                : undefined
          })
        }
      }
      if (tracks.length > 0) break
    }
  }

  return { name, description, tracks, thumbnail, type }
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#32;': ' ',
  }
  
  return text.replace(/&[#\w]+;/g, (match) => entities[match] || match)
}

// Search for a Spotify track on YouTube Music
export async function matchSpotifyTrack(
  track: SpotifyTrack,
  searchFn: (query: string) => Promise<Song[]>
): Promise<Song | null> {
  const artistStr = track.artists.slice(0, 2).join(' ')
  const query = `${track.name} ${artistStr}`
  
  try {
    const results = await searchFn(query)
    
    if (results.length === 0) return null
    
    const trackNameLower = track.name.toLowerCase()
    const artistsLower = track.artists.map(a => a.toLowerCase())
    
    const scored = results.map(song => {
      let score = 0
      const songTitleLower = song.title.toLowerCase()
      const songArtistsLower = song.artists.map(a => a.name.toLowerCase())
      
      if (songTitleLower === trackNameLower) {
        score += 100
      } else if (songTitleLower.includes(trackNameLower) || trackNameLower.includes(songTitleLower)) {
        score += 50
      }
      
      for (const artist of artistsLower) {
        if (songArtistsLower.some(sa => sa.includes(artist) || artist.includes(sa))) {
          score += 30
        }
      }
      
      if (track.duration && song.duration) {
        const diff = Math.abs(track.duration - song.duration)
        if (diff < 5) score += 20
        else if (diff < 15) score += 10
      }
      
      return { song, score }
    })
    
    scored.sort((a, b) => b.score - a.score)
    
    if (scored[0].score >= 30) {
      return scored[0].song
    }
    
    return results[0]
  } catch {
    return null
  }
}
