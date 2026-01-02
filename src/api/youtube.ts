// YouTube Music API - Uses Tauri backend for API calls

import { invoke } from '@tauri-apps/api/core'

export interface Artist {
  id: string | null
  name: string
}

export interface Album {
  id: string
  name: string
}

export interface Song {
  id: string
  title: string
  artists: Artist[]
  album?: Album
  duration: number
  thumbnail: string
  explicit?: boolean
}

export interface PlaylistItem {
  id: string
  title: string
  author?: Artist
  songCount?: string
  thumbnail: string
}

export interface AlbumItem {
  id: string
  playlistId: string
  title: string
  artists: Artist[]
  year?: number
  thumbnail: string
}

export interface ArtistItem {
  id: string
  name: string
  thumbnail: string
  subscribers?: string
}

export interface ArtistPage {
  id: string
  name: string
  thumbnail: string
  description?: string
  subscribers?: string
  songs: Song[]
  albums: AlbumItem[]
}

export interface PlaylistPage {
  id: string
  title: string
  thumbnail: string
  description?: string
  author?: string
  songCount?: number
  songs: Song[]
}

export interface HomeSection {
  title: string
  items: (Song | AlbumItem | ArtistItem | PlaylistItem)[]
}

export interface SearchResult {
  songs: Song[]
  albums: AlbumItem[]
  artists: ArtistItem[]
  playlists: PlaylistItem[]
}

// Check if running in Tauri
const isTauri = () => '__TAURI__' in window

// Parse duration from text like "3:45"
const parseDuration = (text?: string): number => {
  if (!text) return 0
  const parts = text.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

// Parse song from YouTube response
const parseSong = (renderer: any): Song | null => {
  try {
    const flexColumns = renderer.flexColumns
    if (!flexColumns) return null

    const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
    const videoId = renderer.playlistItemData?.videoId || 
                    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId

    // Must have both title and videoId to be a valid song
    if (!title || !videoId) return null

    // Check if this is a playlist or album (not a song)
    const navigationEndpoint = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint
    const browseEndpoint = navigationEndpoint?.browseEndpoint?.browseId
    
    // Skip if it's a playlist (starts with VL or RDCLAK) or album (starts with MPREb)
    if (browseEndpoint && (browseEndpoint.startsWith('VL') || browseEndpoint.startsWith('RDCLAK') || browseEndpoint.startsWith('MPREb'))) {
      return null
    }

    const artists: Artist[] = []
    let album: Album | undefined
    let duration = 0

    // Check all flex columns for duration and artist info
    for (const flexCol of flexColumns) {
      const runs = flexCol?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
      for (const run of runs) {
        const runBrowseId = run.navigationEndpoint?.browseEndpoint?.browseId
        const text = run.text?.trim() || ''
        
        if (runBrowseId?.startsWith('UC')) {
          artists.push({ id: runBrowseId, name: run.text })
        } else if (runBrowseId?.startsWith('MPREb')) {
          album = { id: runBrowseId, name: run.text }
        } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
          duration = parseDuration(text)
        }
      }
    }

    // Check fixedColumns for duration
    const fixedColumns = renderer.fixedColumns || []
    for (const col of fixedColumns) {
      const text = col.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text?.trim()
      if (text && /^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
        duration = parseDuration(text)
        break
      }
      // Also check simpleText
      const simpleText = col.musicResponsiveListItemFixedColumnRenderer?.text?.simpleText?.trim()
      if (simpleText && /^\d{1,2}:\d{2}(:\d{2})?$/.test(simpleText)) {
        duration = parseDuration(simpleText)
        break
      }
    }

    // Check overlay for duration (sometimes it's in the thumbnail overlay)
    const overlayText = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.accessibilityPlayData?.accessibilityData?.label
    if (duration === 0 && overlayText) {
      // Extract duration from accessibility label like "Play Sahiba by Aditya Rikhari, 3 minutes, 45 seconds"
      const minMatch = overlayText.match(/(\d+)\s*minute/)
      const secMatch = overlayText.match(/(\d+)\s*second/)
      if (minMatch || secMatch) {
        const mins = minMatch ? parseInt(minMatch[1]) : 0
        const secs = secMatch ? parseInt(secMatch[1]) : 0
        duration = mins * 60 + secs
      }
    }

    // Try to get duration from lengthText if available
    if (duration === 0) {
      const lengthText = renderer.lengthText?.runs?.[0]?.text || renderer.lengthText?.simpleText
      if (lengthText && /^\d{1,2}:\d{2}(:\d{2})?$/.test(lengthText)) {
        duration = parseDuration(lengthText)
      }
    }

    // Try fixedColumns accessibility data
    if (duration === 0) {
      for (const col of fixedColumns) {
        const accessLabel = col.musicResponsiveListItemFixedColumnRenderer?.text?.accessibility?.accessibilityData?.label
        if (accessLabel) {
          const minMatch = accessLabel.match(/(\d+)\s*minute/)
          const secMatch = accessLabel.match(/(\d+)\s*second/)
          if (minMatch || secMatch) {
            const mins = minMatch ? parseInt(minMatch[1]) : 0
            const secs = secMatch ? parseInt(secMatch[1]) : 0
            duration = mins * 60 + secs
            break
          }
        }
      }
    }

    // Try to extract from the last flex column which sometimes has duration
    if (duration === 0 && flexColumns.length > 1) {
      const lastCol = flexColumns[flexColumns.length - 1]
      const lastColRuns = lastCol?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
      for (const run of lastColRuns) {
        const text = run.text?.trim() || ''
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
          duration = parseDuration(text)
          break
        }
      }
    }

    // Check for playlist indicators in title
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('playlist') || lowerTitle.includes('full album') || lowerTitle.includes('mix -')) {
      return null
    }

    return {
      id: videoId,
      title,
      artists: artists.length > 0 ? artists : [{ id: null, name: 'Unknown Artist' }],
      album,
      duration,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    }
  } catch {
    return null
  }
}

// Parse album
const parseAlbum = (renderer: any): AlbumItem | null => {
  try {
    const title = renderer.title?.runs?.[0]?.text
    const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId
    if (!title || !browseId) return null

    const subtitle = renderer.subtitle?.runs || []
    const artists: Artist[] = []
    let year: number | undefined

    for (const run of subtitle) {
      const artistId = run.navigationEndpoint?.browseEndpoint?.browseId
      if (artistId?.startsWith('UC')) {
        artists.push({ id: artistId, name: run.text })
      } else if (/^\d{4}$/.test(run.text)) {
        year = parseInt(run.text)
      }
    }

    const thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
    const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''

    return {
      id: browseId,
      playlistId: renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId || '',
      title,
      artists,
      year,
      thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail
    }
  } catch {
    return null
  }
}

// Demo data for browser mode
const DEMO_SONGS: Song[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artists: [{ id: null, name: 'Rick Astley' }], duration: 213, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
  { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artists: [{ id: null, name: 'Queen' }], duration: 354, thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg' },
  { id: 'hTWKbfoikeg', title: 'Smells Like Teen Spirit', artists: [{ id: null, name: 'Nirvana' }], duration: 279, thumbnail: 'https://i.ytimg.com/vi/hTWKbfoikeg/hqdefault.jpg' },
  { id: 'Zi_XLOBDo_Y', title: 'Billie Jean', artists: [{ id: null, name: 'Michael Jackson' }], duration: 294, thumbnail: 'https://i.ytimg.com/vi/Zi_XLOBDo_Y/hqdefault.jpg' },
  { id: 'oRdxUFDoQe0', title: 'Sweet Child O Mine', artists: [{ id: null, name: "Guns N' Roses" }], duration: 356, thumbnail: 'https://i.ytimg.com/vi/oRdxUFDoQe0/hqdefault.jpg' },
  { id: 'btPJPFnesV4', title: 'Eye of the Tiger', artists: [{ id: null, name: 'Survivor' }], duration: 245, thumbnail: 'https://i.ytimg.com/vi/btPJPFnesV4/hqdefault.jpg' },
  { id: 'YkgkThdzX-8', title: 'Uptown Funk', artists: [{ id: null, name: 'Bruno Mars' }], duration: 270, thumbnail: 'https://i.ytimg.com/vi/YkgkThdzX-8/hqdefault.jpg' },
  { id: 'JGwWNGJdvx8', title: 'Shape of You', artists: [{ id: null, name: 'Ed Sheeran' }], duration: 234, thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg' },
  { id: 'kJQP7kiw5Fk', title: 'Despacito', artists: [{ id: null, name: 'Luis Fonsi' }], duration: 282, thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg' },
  { id: 'RgKAFK5djSk', title: 'See You Again', artists: [{ id: null, name: 'Wiz Khalifa' }], duration: 237, thumbnail: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg' },
]

// Store current stream URL for audio proxy
let currentStreamUrl: string | null = null

// Parse playlist from home/browse response
const parsePlaylist = (renderer: any): PlaylistItem | null => {
  try {
    const title = renderer.title?.runs?.[0]?.text
    const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId
    if (!title || !browseId) return null
    
    // Must be a playlist (VL or RDCLAK prefix)
    if (!browseId.startsWith('VL') && !browseId.startsWith('RDCLAK')) return null

    const subtitle = renderer.subtitle?.runs || []
    let author: Artist | undefined
    let songCount: string | undefined

    for (const run of subtitle) {
      const artistId = run.navigationEndpoint?.browseEndpoint?.browseId
      if (artistId?.startsWith('UC')) {
        author = { id: artistId, name: run.text }
      } else if (run.text?.includes('song') || run.text?.includes('track')) {
        songCount = run.text
      }
    }

    const thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
    const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''

    return {
      id: browseId,
      title,
      author,
      songCount,
      thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail
    }
  } catch {
    return null
  }
}

// Parse artist from home/browse response
const parseArtistItem = (renderer: any): ArtistItem | null => {
  try {
    const title = renderer.title?.runs?.[0]?.text
    const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId
    if (!title || !browseId) return null
    
    // Must be an artist (UC prefix)
    if (!browseId.startsWith('UC')) return null

    const subtitle = renderer.subtitle?.runs || []
    let subscribers: string | undefined

    for (const run of subtitle) {
      if (run.text?.includes('subscriber')) {
        subscribers = run.text
      }
    }

    const thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
    const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''

    return {
      id: browseId,
      name: title,
      thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail,
      subscribers
    }
  } catch {
    return null
  }
}

// Helper to parse items from shelf contents
const parseShelfItems = (contents: any[]): any[] => {
  const items: any[] = []
  for (const content of contents) {
    if (content.musicTwoRowItemRenderer) {
      const renderer = content.musicTwoRowItemRenderer
      const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId || ''
      
      // Try to determine type by browseId prefix
      if (browseId.startsWith('UC')) {
        const artist = parseArtistItem(renderer)
        if (artist) items.push(artist)
      } else if (browseId.startsWith('VL') || browseId.startsWith('RDCLAK')) {
        const playlist = parsePlaylist(renderer)
        if (playlist) items.push(playlist)
      } else if (browseId.startsWith('MPREb')) {
        const album = parseAlbum(renderer)
        if (album) items.push(album)
      } else {
        // Try album first, then playlist
        const album = parseAlbum(renderer)
        if (album) {
          items.push(album)
        } else {
          const playlist = parsePlaylist(renderer)
          if (playlist) items.push(playlist)
        }
      }
    } else if (content.musicResponsiveListItemRenderer) {
      const song = parseSong(content.musicResponsiveListItemRenderer)
      if (song) items.push(song)
    }
  }
  return items
}

class YouTubeMusic {
  
  // Sections to skip (video-related)
  private skipSectionTitles = ['video', 'music video', 'videos']
  
  private shouldSkipSection(title: string): boolean {
    const lowerTitle = title.toLowerCase()
    return this.skipSectionTitles.some(skip => lowerTitle.includes(skip))
  }
  
  async getHome(): Promise<HomeSection[]> {
    if (isTauri()) {
      try {
        const sections: HomeSection[] = []
        
        // Fetch main home content
        const data = await invoke<any>('yt_browse', { browseId: 'FEmusic_home' })
        const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []

        for (const section of contents) {
          const shelf = section.musicCarouselShelfRenderer
          if (!shelf) continue

          const title = shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text
          if (!title) continue
          
          // Skip video sections
          if (this.shouldSkipSection(title)) continue

          const items = parseShelfItems(shelf.contents || [])

          if (items.length > 0) {
            sections.push({ title, items })
          }
        }

        // Fetch charts for more content
        try {
          const chartsData = await invoke<any>('yt_browse', { browseId: 'FEmusic_charts' })
          const chartsContents = chartsData.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
          
          for (const section of chartsContents) {
            const shelf = section.musicCarouselShelfRenderer
            if (!shelf) continue

            const title = shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text
            if (!title) continue
            
            // Skip video sections
            if (this.shouldSkipSection(title)) continue
            
            // Skip if we already have this section
            if (sections.some(s => s.title === title)) continue

            const items = parseShelfItems(shelf.contents || [])

            if (items.length > 0) {
              sections.push({ title, items })
            }
          }
        } catch {
          // Charts fetch failed, continue with what we have
        }

        // Fetch explore/new releases for more content
        try {
          const exploreData = await invoke<any>('yt_browse', { browseId: 'FEmusic_explore' })
          const exploreContents = exploreData.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
          
          for (const section of exploreContents) {
            const shelf = section.musicCarouselShelfRenderer
            if (!shelf) continue

            const title = shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text
            if (!title) continue
            
            // Skip video sections
            if (this.shouldSkipSection(title)) continue
            
            // Skip if we already have this section
            if (sections.some(s => s.title === title)) continue

            const items = parseShelfItems(shelf.contents || [])

            if (items.length > 0) {
              sections.push({ title, items })
            }
          }
        } catch {
          // Explore fetch failed, continue with what we have
        }

        // Generate additional sections by searching popular genres/moods
        const genreSearches = [
          { query: 'top hits 2024', title: 'Top Hits' },
          { query: 'trending songs', title: 'Trending Now' },
          { query: 'pop music hits', title: 'Pop Hits' },
          { query: 'chill vibes music', title: 'Chill Vibes' },
          { query: 'workout music', title: 'Workout' },
          { query: 'party songs', title: 'Party Mix' },
          { query: 'romantic songs', title: 'Romantic' },
          { query: 'hip hop hits', title: 'Hip Hop' },
          { query: 'rock classics', title: 'Rock Classics' },
          { query: 'electronic dance music', title: 'Electronic' },
          { query: 'lo-fi beats', title: 'Lo-Fi Beats' },
          { query: 'acoustic covers', title: 'Acoustic' },
        ]
        
        // Fetch a few genre sections in parallel (limit to avoid too many requests)
        const genresToFetch = genreSearches.filter(g => !sections.some(s => s.title === g.title)).slice(0, 6)
        
        const genreResults = await Promise.allSettled(
          genresToFetch.map(async ({ query, title }) => {
            try {
              const searchResult = await this.searchAll(query)
              if (searchResult.songs.length > 0) {
                return { title, items: searchResult.songs.slice(0, 15) }
              }
              return null
            } catch {
              return null
            }
          })
        )
        
        for (const result of genreResults) {
          if (result.status === 'fulfilled' && result.value) {
            sections.push(result.value)
          }
        }

        return sections
      } catch (error) {
        console.error('Failed to fetch home:', error)
      }
    }
    
    // Fallback: return demo data
    return [
      { title: 'Classic Hits', items: DEMO_SONGS.slice(0, 5) },
      { title: 'Popular Now', items: DEMO_SONGS.slice(5, 10) },
    ]
  }

  async searchAll(query: string): Promise<SearchResult> {
    const result: SearchResult = { songs: [], albums: [], artists: [], playlists: [] }
    
    if (isTauri()) {
      try {
        const data = await invoke<any>('yt_search', { query })
        
        const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []

        for (const section of contents) {
          const shelf = section.musicShelfRenderer
          if (!shelf) continue

          const shelfTitle = shelf.title?.runs?.[0]?.text?.toLowerCase() || ''

          for (const content of shelf.contents || []) {
            const renderer = content.musicResponsiveListItemRenderer
            if (!renderer) continue

            const flexColumns = renderer.flexColumns
            if (!flexColumns) continue
            
            const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId
            const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
            
            // Get thumbnail from multiple possible locations
            const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
            let thumbnail = thumbnails[thumbnails.length - 1]?.url || ''
            
            // Also try thumbnailRenderer (used in some responses)
            if (!thumbnail) {
              const altThumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
              thumbnail = altThumbnails[altThumbnails.length - 1]?.url || ''
            }
            
            // Fix URL format
            if (thumbnail && thumbnail.startsWith('//')) {
              thumbnail = 'https:' + thumbnail
            }
            
            const secondColumn = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []

            // Artist detection
            if (browseId?.startsWith('UC') || shelfTitle.includes('artist')) {
              if (title) {
                const subscribers = secondColumn.find((r: any) => r.text?.includes('subscriber'))?.text
                result.artists.push({
                  id: browseId || '',
                  name: title,
                  thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail,
                  subscribers
                })
                continue
              }
            }

            // Album detection
            if (browseId?.startsWith('MPREb') || shelfTitle.includes('album')) {
              if (title) {
                const artists = secondColumn
                  .filter((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))
                  .map((r: any) => ({ id: r.navigationEndpoint?.browseEndpoint?.browseId, name: r.text }))
                const year = secondColumn.find((r: any) => /^\d{4}$/.test(r.text))?.text
                
                result.albums.push({
                  id: browseId || '',
                  playlistId: '',
                  title,
                  artists,
                  year: year ? parseInt(year) : undefined,
                  thumbnail
                })
                continue
              }
            }

            // Playlist detection
            if (browseId?.startsWith('VL') || browseId?.startsWith('RDCLAK') || shelfTitle.includes('playlist')) {
              if (title) {
                const author = secondColumn.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))
                const songCount = secondColumn.find((r: any) => r.text?.includes('song'))?.text
                
                result.playlists.push({
                  id: browseId || '',
                  title,
                  author: author ? { id: author.navigationEndpoint?.browseEndpoint?.browseId, name: author.text } : undefined,
                  songCount,
                  thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail
                })
                continue
              }
            }

            // Otherwise try to parse as song
            const song = parseSong(renderer)
            if (song) result.songs.push(song)
          }
        }

        return result
      } catch (error) {
        console.error('Search failed:', error)
      }
    }
    
    // Fallback: filter demo data
    const q = query.toLowerCase()
    result.songs = DEMO_SONGS.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artists.some(a => a.name.toLowerCase().includes(q))
    )
    return result
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    if (isTauri()) {
      try {
        const data = await invoke<any>('yt_suggestions', { input: query })
        
        const suggestions: string[] = []
        const contents = data.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || []
        for (const content of contents) {
          const text = content.searchSuggestionRenderer?.suggestion?.runs?.map((r: any) => r.text).join('')
          if (text) suggestions.push(text)
        }
        return suggestions
      } catch {
        return []
      }
    }
    
    return ['pop music', 'rock classics', 'hip hop', 'jazz', 'electronic'].filter(s => s.includes(query.toLowerCase()))
  }

  async getStreamUrl(videoId: string): Promise<string | null> {
    if (isTauri()) {
      try {
        const url = await invoke<string | null>('yt_stream', { videoId })
        if (url) {
          currentStreamUrl = url
          return url
        }
      } catch (error) {
        console.error('Failed to get stream URL:', error)
      }
    }
    
    console.warn('Audio streaming requires Tauri app. Run: npm run tauri:dev')
    return null
  }

  // Proxy audio through Tauri to bypass CORS
  async proxyAudio(url: string, range?: string): Promise<ArrayBuffer | null> {
    if (isTauri()) {
      try {
        const bytes = await invoke<number[]>('proxy_audio', { url, range })
        return new Uint8Array(bytes).buffer
      } catch (error) {
        console.error('Audio proxy failed:', error)
      }
    }
    return null
  }

  getCurrentStreamUrl(): string | null {
    return currentStreamUrl
  }

  async getArtist(artistId: string): Promise<ArtistPage | null> {
    if (isTauri()) {
      try {
        const data = await invoke<any>('yt_browse', { browseId: artistId })
        
        const header = data.header?.musicImmersiveHeaderRenderer || data.header?.musicVisualHeaderRenderer
        const name = header?.title?.runs?.[0]?.text || 'Unknown Artist'
        const thumbnails = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
        const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''
        const subscribers = header?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text
        const description = header?.description?.runs?.[0]?.text

        const songs: Song[] = []
        const albums: AlbumItem[] = []

        const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []

        for (const section of contents) {
          const shelf = section.musicShelfRenderer
          if (shelf) {
            // Songs section
            for (const content of shelf.contents || []) {
              if (content.musicResponsiveListItemRenderer) {
                const song = parseSong(content.musicResponsiveListItemRenderer)
                if (song) songs.push(song)
              }
            }
          }

          const carousel = section.musicCarouselShelfRenderer
          if (carousel) {
            // Albums/Singles section
            for (const content of carousel.contents || []) {
              if (content.musicTwoRowItemRenderer) {
                const album = parseAlbum(content.musicTwoRowItemRenderer)
                if (album) albums.push(album)
              }
            }
          }
        }

        return {
          id: artistId,
          name,
          thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail,
          description,
          subscribers,
          songs,
          albums
        }
      } catch (error) {
        console.error('Failed to fetch artist:', error)
      }
    }
    return null
  }

  async searchArtists(query: string): Promise<ArtistItem[]> {
    if (isTauri()) {
      try {
        // Search with artist filter
        const data = await invoke<any>('yt_search', { 
          query, 
          params: 'EgWKAQIgAWoKEAkQAxAEEAoQBQ%3D%3D' // Artist filter
        })
        
        const artists: ArtistItem[] = []
        const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []

        for (const section of contents) {
          const shelf = section.musicShelfRenderer
          if (!shelf) continue

          for (const content of shelf.contents || []) {
            const renderer = content.musicResponsiveListItemRenderer
            if (!renderer) continue

            const flexColumns = renderer.flexColumns
            if (!flexColumns) continue

            const name = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
            const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId

            if (name && browseId?.startsWith('UC')) {
              const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
              const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''
              
              const secondColumn = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
              const subscribers = secondColumn.find((r: any) => r.text?.includes('subscriber'))?.text

              artists.push({
                id: browseId,
                name,
                thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail,
                subscribers
              })
            }
          }
        }

        return artists
      } catch (error) {
        console.error('Artist search failed:', error)
      }
    }
    return []
  }

  async getPlaylist(playlistId: string): Promise<PlaylistPage | null> {
    if (isTauri()) {
      try {
        // Playlist IDs need VL prefix for browse endpoint
        const browseId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`
        const data = await invoke<any>('yt_browse', { browseId })
        
        const header = data.header?.musicDetailHeaderRenderer || data.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicDetailHeaderRenderer
        const title = header?.title?.runs?.[0]?.text || 'Playlist'
        const thumbnails = header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails || 
                          header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                          data.background?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
        const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''
        const description = header?.description?.runs?.map((r: any) => r.text).join('') || ''
        const author = header?.subtitle?.runs?.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))?.text
        const songCountText = header?.secondSubtitle?.runs?.[0]?.text || ''
        const songCount = parseInt(songCountText) || 0

        const songs: Song[] = []
        
        // Try multiple content locations - playlists can use different structures
        const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                        data.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents ||
                        []

        // Helper to parse playlist track
        const parsePlaylistTrack = (renderer: any): Song | null => {
          try {
            const flexColumns = renderer.flexColumns
            if (!flexColumns) return null

            const trackTitle = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
            
            // Try multiple locations for videoId
            let videoId = renderer.playlistItemData?.videoId ||
                         renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId
            
            // Try watchEndpoint in the title navigation
            if (!videoId) {
              const navEndpoint = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint
              videoId = navEndpoint?.watchEndpoint?.videoId
            }

            // Try overlay play button
            if (!videoId) {
              const playButton = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
              videoId = playButton?.playNavigationEndpoint?.watchEndpoint?.videoId ||
                       playButton?.playNavigationEndpoint?.watchPlaylistEndpoint?.videoId
            }

            if (!trackTitle || !videoId) {
              return null
            }

            const artists: Artist[] = []
            let duration = 0

            for (const flexCol of flexColumns) {
              const runs = flexCol?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
              for (const run of runs) {
                const runBrowseId = run.navigationEndpoint?.browseEndpoint?.browseId
                const text = run.text?.trim() || ''
                
                if (runBrowseId?.startsWith('UC')) {
                  artists.push({ id: runBrowseId, name: run.text })
                } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                  duration = parseDuration(text)
                }
              }
            }

            // If no artists found, try second column without UC check
            if (artists.length === 0 && flexColumns[1]) {
              const secondColRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
              for (const run of secondColRuns) {
                const text = run.text?.trim() || ''
                if (text && text !== '•' && text !== ' • ' && text !== ',' && text !== ' & ' && !/^\d{1,2}:\d{2}/.test(text) && text !== 'Song' && text !== 'Album') {
                  artists.push({ id: run.navigationEndpoint?.browseEndpoint?.browseId || null, name: text })
                  break
                }
              }
            }

            // Check fixedColumns for duration
            const fixedColumns = renderer.fixedColumns || []
            for (const col of fixedColumns) {
              const text = col.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text?.trim()
              if (text && /^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                duration = parseDuration(text)
                break
              }
              const simpleText = col.musicResponsiveListItemFixedColumnRenderer?.text?.simpleText?.trim()
              if (simpleText && /^\d{1,2}:\d{2}(:\d{2})?$/.test(simpleText)) {
                duration = parseDuration(simpleText)
                break
              }
            }

            return {
              id: videoId,
              title: trackTitle,
              artists: artists.length > 0 ? artists : [{ id: null, name: 'Unknown Artist' }],
              duration,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            }
          } catch {
            return null
          }
        }

        for (const section of contents) {
          const shelf = section.musicPlaylistShelfRenderer || section.musicShelfRenderer
          if (shelf) {
            for (const content of shelf.contents || []) {
              if (content.musicResponsiveListItemRenderer) {
                const song = parsePlaylistTrack(content.musicResponsiveListItemRenderer)
                if (song) songs.push(song)
              }
            }
          }
        }

        return {
          id: playlistId,
          title,
          thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail,
          description,
          author,
          songCount: songCount || songs.length,
          songs
        }
      } catch (error) {
        console.error('Failed to fetch playlist:', error)
      }
    }
    return null
  }

  async getAlbum(albumId: string): Promise<PlaylistPage | null> {
    if (isTauri()) {
      try {
        const data = await invoke<any>('yt_browse', { browseId: albumId })
        
        // Try different header locations - twoColumnBrowseResultsRenderer uses different structure
        let header = data.header?.musicDetailHeaderRenderer || 
                     data.header?.musicImmersiveHeaderRenderer
        
        // For twoColumnBrowseResultsRenderer, header might be in tabs
        if (!header && data.contents?.twoColumnBrowseResultsRenderer) {
          const tabs = data.contents.twoColumnBrowseResultsRenderer.tabs || []
          for (const tab of tabs) {
            const tabContent = tab.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
            if (tabContent?.musicResponsiveHeaderRenderer) {
              header = tabContent.musicResponsiveHeaderRenderer
              break
            }
          }
        }
        
        const title = header?.title?.runs?.[0]?.text || 
                      data.header?.musicDetailHeaderRenderer?.title?.runs?.[0]?.text ||
                      'Album'
        
        // Try different thumbnail locations including background
        const thumbnails = header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails || 
                          header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                          header?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                          data.background?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                          []
        const thumbnail = thumbnails[thumbnails.length - 1]?.url || ''
        
        // Get subtitle runs from multiple possible locations
        const subtitleRuns = header?.subtitle?.runs || 
                            header?.straplineTextOne?.runs || 
                            header?.strapline?.runs ||
                            []
        
        // Try to find artist from subtitle - look for UC prefix or just take first text that's not a year/type
        let author = subtitleRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))?.text
        
        // If no UC-prefixed artist found, try to get artist name from subtitle
        if (!author && subtitleRuns.length > 0) {
          for (const run of subtitleRuns) {
            const text = run.text?.trim() || ''
            // Skip separators, years, and type indicators
            if (text && text !== '•' && text !== ' • ' && text !== 'Album' && text !== 'EP' && text !== 'Single' && !/^\d{4}$/.test(text)) {
              author = text
              break
            }
          }
        }
        
        // If still no author, try to extract from the first track's menu or other locations
        if (!author) {
          // Try straplineTextOne which sometimes has artist info
          const strapline = header?.straplineTextOne?.runs?.[0]?.text
          if (strapline && strapline !== 'Album') {
            author = strapline
          }
        }
        
        const year = subtitleRuns.find((r: any) => /^\d{4}$/.test(r.text))?.text
        const description = header?.description?.runs?.map((r: any) => r.text).join('') || ''

        const songs: Song[] = []
        
        // Try different content locations
        const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                        data.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents ||
                        data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                        []

        // Helper to parse album track (more lenient than parseSong)
        const parseAlbumTrack = (renderer: any, albumArtist?: string): Song | null => {
          try {
            const flexColumns = renderer.flexColumns
            if (!flexColumns) return null

            const trackTitle = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
            
            // Try multiple locations for videoId
            let videoId = renderer.playlistItemData?.videoId ||
                         renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId
            
            // Try to get from watchEndpoint in the title
            if (!videoId) {
              const watchEndpoint = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint
              videoId = watchEndpoint?.videoId
            }

            // Try overlay play button
            if (!videoId) {
              const playButton = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
              videoId = playButton?.playNavigationEndpoint?.watchEndpoint?.videoId ||
                       playButton?.playNavigationEndpoint?.watchPlaylistEndpoint?.videoId
            }

            if (!trackTitle || !videoId) return null

            const artists: Artist[] = []
            let duration = 0

            // Check all flex columns for duration and artist info
            for (const flexCol of flexColumns) {
              const runs = flexCol?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
              for (const run of runs) {
                const runBrowseId = run.navigationEndpoint?.browseEndpoint?.browseId
                const text = run.text?.trim() || ''
                
                // Artist can have UC prefix or be in second column without navigation
                if (runBrowseId?.startsWith('UC')) {
                  artists.push({ id: runBrowseId, name: run.text })
                } else if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                  duration = parseDuration(text)
                }
              }
            }

            // If no artists found from UC IDs, try to get artist name from second column
            if (artists.length === 0 && flexColumns[1]) {
              const secondColRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
              for (const run of secondColRuns) {
                const text = run.text?.trim() || ''
                // Skip separators, durations, and type indicators
                if (text && text !== '•' && text !== ' • ' && !/^\d{1,2}:\d{2}/.test(text) && text !== 'Song' && text !== 'Album') {
                  artists.push({ id: run.navigationEndpoint?.browseEndpoint?.browseId || null, name: text })
                  break // Just get the first artist name
                }
              }
            }

            // Check fixedColumns for duration
            const fixedColumns = renderer.fixedColumns || []
            for (const col of fixedColumns) {
              const text = col.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text?.trim()
              if (text && /^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
                duration = parseDuration(text)
                break
              }
              const simpleText = col.musicResponsiveListItemFixedColumnRenderer?.text?.simpleText?.trim()
              if (simpleText && /^\d{1,2}:\d{2}(:\d{2})?$/.test(simpleText)) {
                duration = parseDuration(simpleText)
                break
              }
            }

            // Use album artist as fallback
            const finalArtists = artists.length > 0 ? artists : (albumArtist ? [{ id: null, name: albumArtist }] : [{ id: null, name: 'Unknown Artist' }])

            return {
              id: videoId,
              title: trackTitle,
              artists: finalArtists,
              duration,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            }
          } catch {
            return null
          }
        }

        for (const section of contents) {
          // Try musicShelfRenderer
          const shelf = section.musicShelfRenderer
          if (shelf) {
            for (const content of shelf.contents || []) {
              if (content.musicResponsiveListItemRenderer) {
                const song = parseAlbumTrack(content.musicResponsiveListItemRenderer, author)
                if (song) songs.push(song)
              }
            }
          }
          
          // Try musicPlaylistShelfRenderer
          const playlistShelf = section.musicPlaylistShelfRenderer
          if (playlistShelf) {
            for (const content of playlistShelf.contents || []) {
              if (content.musicResponsiveListItemRenderer) {
                const song = parseAlbumTrack(content.musicResponsiveListItemRenderer, author)
                if (song) songs.push(song)
              }
            }
          }
        }

        return {
          id: albumId,
          title,
          thumbnail: thumbnail.startsWith('//') ? 'https:' + thumbnail : thumbnail,
          description: year ? `${year}${description ? ' • ' + description : ''}` : description,
          author,
          songCount: songs.length,
          songs
        }
      } catch (error) {
        console.error('Failed to fetch album:', error)
      }
    }
    return null
  }
  // Get radio/recommendations based on a video ID
  async getRadio(videoId: string): Promise<Song[]> {
    if (isTauri()) {
      try {
        // Use the next endpoint to get related songs (radio)
        const data = await invoke<any>('yt_next', { videoId })
        
        const songs: Song[] = []
        
        // Try to find related songs in the response
        // They can be in automixContents or watchNextRenderer
        const automixContents = data.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || []
        
        for (const content of automixContents) {
          const renderer = content.playlistPanelVideoRenderer
          if (!renderer) continue
          
          const title = renderer.title?.runs?.[0]?.text
          const id = renderer.videoId
          if (!title || !id) continue
          
          const artists: Artist[] = []
          const longBylineRuns = renderer.longBylineText?.runs || renderer.shortBylineText?.runs || []
          
          for (const run of longBylineRuns) {
            const browseId = run.navigationEndpoint?.browseEndpoint?.browseId
            if (browseId?.startsWith('UC')) {
              artists.push({ id: browseId, name: run.text })
            } else if (run.text && run.text !== '•' && run.text !== ' • ' && !artists.length) {
              artists.push({ id: null, name: run.text })
            }
          }
          
          // Parse duration
          let duration = 0
          const lengthText = renderer.lengthText?.runs?.[0]?.text || renderer.lengthText?.simpleText
          if (lengthText && /^\d{1,2}:\d{2}(:\d{2})?$/.test(lengthText)) {
            duration = parseDuration(lengthText)
          }
          
          songs.push({
            id,
            title,
            artists: artists.length > 0 ? artists : [{ id: null, name: 'Unknown Artist' }],
            duration,
            thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
          })
        }
        
        // Skip the first song (it's the current one) and return the rest
        return songs.slice(1)
      } catch {
        // Silently fail
      }
    }
    return []
  }

  // Get recommendations based on multiple video IDs (from history)
  async getRecommendations(videoIds: string[]): Promise<Song[]> {
    if (videoIds.length === 0) return []
    
    // Pick a random video from history to base recommendations on
    const randomId = videoIds[Math.floor(Math.random() * Math.min(videoIds.length, 10))]
    return this.getRadio(randomId)
  }
}

export const youtube = new YouTubeMusic()
