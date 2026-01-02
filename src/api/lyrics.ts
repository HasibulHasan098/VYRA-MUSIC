// Lyrics API using LRCLIB (free, no API key needed)

export interface LyricLine {
  time: number // in seconds
  text: string
}

export interface LyricsResult {
  syncedLyrics: LyricLine[] | null
  plainLyrics: string | null
  source: string
}

// Parse LRC format to timed lyrics
function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g
  let match

  while ((match = regex.exec(lrc)) !== null) {
    const minutes = parseInt(match[1])
    const seconds = parseInt(match[2])
    const ms = parseInt(match[3].padEnd(3, '0'))
    const time = minutes * 60 + seconds + ms / 1000
    const text = match[4].trim()
    
    if (text) {
      lines.push({ time, text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

// Fetch lyrics from LRCLIB
export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number
): Promise<LyricsResult | null> {
  try {
    // Clean up title and artist
    const cleanTitle = title
      .replace(/\(.*?\)/g, '') // Remove parentheses content
      .replace(/\[.*?\]/g, '') // Remove brackets content
      .replace(/feat\..*/i, '') // Remove featuring
      .replace(/ft\..*/i, '')
      .trim()
    
    const cleanArtist = artist
      .split(',')[0] // Take first artist
      .trim()

    // Try LRCLIB API
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    })
    
    if (duration && duration > 0) {
      params.append('duration', Math.round(duration).toString())
    }

    const response = await fetch(`https://lrclib.net/api/get?${params}`)
    
    if (response.ok) {
      const data = await response.json()
      
      if (data.syncedLyrics) {
        return {
          syncedLyrics: parseLRC(data.syncedLyrics),
          plainLyrics: data.plainLyrics || null,
          source: 'LRCLIB'
        }
      }
      
      if (data.plainLyrics) {
        return {
          syncedLyrics: null,
          plainLyrics: data.plainLyrics,
          source: 'LRCLIB'
        }
      }
    }

    // Try search endpoint as fallback
    const searchResponse = await fetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`
    )
    
    if (searchResponse.ok) {
      const results = await searchResponse.json()
      
      if (results && results.length > 0) {
        // Find best match (prefer synced lyrics)
        const withSynced = results.find((r: any) => r.syncedLyrics)
        const best = withSynced || results[0]
        
        if (best.syncedLyrics) {
          return {
            syncedLyrics: parseLRC(best.syncedLyrics),
            plainLyrics: best.plainLyrics || null,
            source: 'LRCLIB'
          }
        }
        
        if (best.plainLyrics) {
          return {
            syncedLyrics: null,
            plainLyrics: best.plainLyrics,
            source: 'LRCLIB'
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Failed to fetch lyrics:', error)
    return null
  }
}
