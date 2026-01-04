import { useState } from 'react'
import { Loader2, Play, Pause, Music, ListMusic } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import TrackRow from './TrackRow'
import ArtistAvatar from './ArtistAvatar'
import Tooltip from './Tooltip'
import { AlbumItem, PlaylistItem } from '../api/youtube'

type FilterTab = 'all' | 'songs' | 'artists' | 'albums' | 'playlists'

// Generate a consistent color based on the title
const getColorFromTitle = (title: string): string => {
  const colors = [
    'from-red-500 to-red-700',
    'from-orange-500 to-orange-700',
    'from-amber-500 to-amber-700',
    'from-yellow-500 to-yellow-700',
    'from-lime-500 to-lime-700',
    'from-green-500 to-green-700',
    'from-emerald-500 to-emerald-700',
    'from-teal-500 to-teal-700',
    'from-cyan-500 to-cyan-700',
    'from-sky-500 to-sky-700',
    'from-blue-500 to-blue-700',
    'from-indigo-500 to-indigo-700',
    'from-violet-500 to-violet-700',
    'from-purple-500 to-purple-700',
    'from-fuchsia-500 to-fuchsia-700',
    'from-pink-500 to-pink-700',
  ]
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Album card component for search results
function SearchAlbumCard({ album, onClick }: { album: AlbumItem; onClick: () => void }) {
  const { darkMode } = useAppStore()
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const showFallback = !album.thumbnail || imgError

  return (
    <div 
      className={`p-fib-13 rounded-fib-13 cursor-pointer ios-transition group
        ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
      onClick={onClick}
    >
      <div className="relative mb-fib-8">
        {showFallback ? (
          <div className={`w-full aspect-square rounded-fib-8 bg-gradient-to-br ${getColorFromTitle(album.title)} flex items-center justify-center`}>
            <Music size={34} className="text-white/80" />
          </div>
        ) : (
          <div className="relative w-full aspect-square">
            {!imgLoaded && (
              <div className={`absolute inset-0 rounded-fib-8 bg-gradient-to-br ${getColorFromTitle(album.title)} flex items-center justify-center`}>
                <Music size={34} className="text-white/80" />
              </div>
            )}
            <img
              src={album.thumbnail}
              alt=""
              className={`w-full aspect-square rounded-fib-8 object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onError={() => setImgError(true)}
              onLoad={() => setImgLoaded(true)}
            />
          </div>
        )}
        <div className="absolute bottom-fib-5 right-fib-5 w-fib-34 h-fib-34 rounded-full bg-ios-blue flex items-center justify-center shadow-ios-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ios-transition">
          <Play size={16} fill="white" className="text-white ml-0.5" />
        </div>
      </div>
      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
        {album.title}
      </p>
      <p className="text-fib-8 text-ios-gray truncate">
        {album.artists?.map(a => a.name).join(', ') || (album.year ? `${album.year}` : 'Album')}
      </p>
    </div>
  )
}

// Playlist card component for search results
function SearchPlaylistCard({ playlist, onClick }: { playlist: PlaylistItem; onClick: () => void }) {
  const { darkMode } = useAppStore()
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const showFallback = !playlist.thumbnail || imgError

  return (
    <div 
      className={`p-fib-13 rounded-fib-13 cursor-pointer ios-transition group
        ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
      onClick={onClick}
    >
      <div className="relative mb-fib-8">
        {showFallback ? (
          <div className={`w-full aspect-square rounded-fib-8 bg-gradient-to-br ${getColorFromTitle(playlist.title)} flex items-center justify-center`}>
            <ListMusic size={34} className="text-white/80" />
          </div>
        ) : (
          <div className="relative w-full aspect-square">
            {!imgLoaded && (
              <div className={`absolute inset-0 rounded-fib-8 bg-gradient-to-br ${getColorFromTitle(playlist.title)} flex items-center justify-center`}>
                <ListMusic size={34} className="text-white/80" />
              </div>
            )}
            <img
              src={playlist.thumbnail}
              alt=""
              className={`w-full aspect-square rounded-fib-8 object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onError={() => setImgError(true)}
              onLoad={() => setImgLoaded(true)}
            />
          </div>
        )}
        <div className="absolute bottom-fib-5 right-fib-5 w-fib-34 h-fib-34 rounded-full bg-ios-blue flex items-center justify-center shadow-ios-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ios-transition">
          <Play size={16} fill="white" className="text-white ml-0.5" />
        </div>
      </div>
      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
        {playlist.title}
      </p>
      <p className="text-fib-8 text-ios-gray truncate">
        {playlist.author?.name || playlist.songCount || 'Playlist'}
      </p>
    </div>
  )
}

export default function SearchResults() {
  const { darkMode, searchQuery, searchResults, isLoadingSearch, openArtist, openAlbum, openPlaylist } = useAppStore()
  const { setQueue, setCurrentTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'songs', label: 'Songs' },
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' },
    { id: 'playlists', label: 'Playlists' },
  ]

  const topResult = searchResults?.songs?.[0]

  // Get artists from search results (with thumbnails) or extract from songs
  const getArtists = () => {
    if (searchResults?.artists && searchResults.artists.length > 0) {
      return searchResults.artists.slice(0, 6)
    }
    // Fallback: extract unique artists from songs
    const artistMap = new Map<string, { id: string | null; name: string }>()
    searchResults?.songs.forEach(song => {
      song.artists.forEach(artist => {
        if (!artistMap.has(artist.name)) {
          artistMap.set(artist.name, artist)
        }
      })
    })
    return Array.from(artistMap.values()).slice(0, 6)
  }

  const handleArtistClick = (artistId: string | null, artistName: string) => {
    if (artistId) {
      openArtist(artistId)
    } else {
      // If no ID, search for the artist
      useAppStore.getState().performSearch(artistName)
    }
  }

  return (
    <div className={`h-full overflow-y-auto p-fib-21
      ${darkMode ? 'bg-ios-bg-dark' : 'bg-ios-bg'}`}>
      
      {/* Filter tabs */}
      {searchResults && (
        <div className="flex gap-fib-8 overflow-x-auto pb-fib-13 mb-fib-13">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-fib-13 py-fib-8 rounded-fib-34 text-fib-13 font-medium whitespace-nowrap ios-active ios-transition
                ${activeTab === id 
                  ? 'bg-white text-black' 
                  : darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {isLoadingSearch && (
        <div className="flex flex-col items-center justify-center py-fib-89">
          <Loader2 size={34} className="animate-spin text-ios-blue mb-fib-13" />
          <p className="text-fib-13 text-ios-gray">Searching...</p>
        </div>
      )}

      {/* Results - Spotify style layout */}
      {searchResults && !isLoadingSearch && (
        <div className="space-y-fib-21">
          {searchResults.songs.length === 0 && searchResults.artists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-fib-89 text-center">
              <p className={`text-fib-21 font-semibold mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
                No results found for "{searchQuery}"
              </p>
              <p className="text-fib-13 text-ios-gray">
                Check your spelling or try different keywords
              </p>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'songs') && searchResults.songs.length > 0 && (
            <div className={`grid gap-fib-21 ${activeTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              
              {/* Top Result - only show in 'all' tab */}
              {activeTab === 'all' && topResult && (
                <section>
                  <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
                    Top result
                  </h2>
                  <div 
                    onClick={() => setCurrentTrack(topResult)}
                    className={`group relative p-fib-21 rounded-fib-13 cursor-pointer ios-transition
                      ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
                  >
                    <div className="w-fib-89 h-fib-89 rounded-fib-8 overflow-hidden shadow-ios-lg mb-fib-13">
                      <img 
                        src={`https://img.youtube.com/vi/${topResult.id}/hqdefault.jpg`} 
                        alt={topResult.title}
                        className="w-full h-full object-cover scale-[1.35]"
                      />
                    </div>
                    <h3 className={`text-fib-34 font-bold mb-fib-5 truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                      {topResult.title}
                    </h3>
                    <p className="text-fib-13 text-ios-gray">
                      <span className={`inline-block px-fib-8 py-fib-3 rounded-fib-5 mr-fib-8 text-fib-8 font-medium
                        ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                        Song
                      </span>
                      {topResult.artists.map(a => a.name).join(', ')}
                    </p>
                    
                    {/* Play button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        if (currentTrack?.id === topResult.id) {
                          // Same track - toggle play/pause
                          togglePlay()
                        } else {
                          // Different track - start playing
                          setQueue(searchResults.songs, 0)
                        }
                      }}
                      title={currentTrack?.id === topResult.id && isPlaying ? "Pause" : "Play"}
                      className="absolute bottom-fib-21 right-fib-21 w-fib-55 h-fib-55 rounded-full bg-ios-blue flex items-center justify-center shadow-ios-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ios-transition ios-active"
                    >
                      {currentTrack?.id === topResult.id && isPlaying ? (
                        <Pause size={24} fill="white" className="text-white" />
                      ) : (
                        <Play size={24} fill="white" className="text-white ml-1" />
                      )}
                    </button>
                  </div>
                </section>
              )}

              {/* Songs list */}
              <section className={activeTab === 'all' ? '' : 'col-span-full'}>
                <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
                  Songs
                </h2>
                <div className="space-y-fib-3">
                  {searchResults.songs.slice(0, activeTab === 'all' ? 4 : 20).map((track, index) => (
                    <TrackRow 
                      key={track.id} 
                      track={track} 
                      index={index}
                      allTracks={searchResults.songs}
                      showDuration={false}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Artists section */}
          {(activeTab === 'all' || activeTab === 'artists') && (searchResults.songs.length > 0 || searchResults.artists.length > 0) && (
            <section className="overflow-hidden">
              <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
                Artists
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-fib-13 overflow-hidden">
                {searchResults.artists.length > 0 ? (
                  // Show artists from search results (with thumbnails)
                  searchResults.artists.slice(0, 6).map((artist) => (
                    <div 
                      key={artist.id}
                      className={`p-fib-13 rounded-fib-13 text-center cursor-pointer ios-transition overflow-hidden
                        ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
                      onClick={() => handleArtistClick(artist.id, artist.name)}
                    >
                      <div className="flex justify-center mb-fib-13 overflow-hidden">
                        <ArtistAvatar 
                          name={artist.name} 
                          thumbnail={artist.thumbnail} 
                        />
                      </div>
                      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                        {artist.name}
                      </p>
                      <p className="text-fib-8 text-ios-gray truncate">
                        {artist.subscribers || 'Artist'}
                      </p>
                    </div>
                  ))
                ) : (
                  // Fallback: extract artists from songs
                  getArtists().map((artist, idx) => (
                    <div 
                      key={idx}
                      className={`p-fib-13 rounded-fib-13 text-center cursor-pointer ios-transition overflow-hidden
                        ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
                      onClick={() => handleArtistClick(artist.id, artist.name)}
                    >
                      <div className="flex justify-center mb-fib-13 overflow-hidden">
                        <ArtistAvatar 
                          name={artist.name} 
                        />
                      </div>
                      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                        {artist.name}
                      </p>
                      <p className="text-fib-8 text-ios-gray truncate">Artist</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Albums section */}
          {(activeTab === 'all' || activeTab === 'albums') && searchResults.albums && searchResults.albums.length > 0 && (
            <section className="overflow-hidden">
              <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
                Albums
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-fib-13 overflow-hidden">
                {searchResults.albums.slice(0, activeTab === 'all' ? 6 : 12).map((album) => (
                  <SearchAlbumCard 
                    key={album.id} 
                    album={album} 
                    onClick={() => openAlbum(album.id)} 
                  />
                ))}
              </div>
            </section>
          )}

          {/* Playlists section */}
          {(activeTab === 'all' || activeTab === 'playlists') && searchResults.playlists && searchResults.playlists.length > 0 && (
            <section className="overflow-hidden">
              <h2 className={`text-fib-21 font-bold mb-fib-13 ${darkMode ? 'text-white' : 'text-black'}`}>
                Playlists
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-fib-13 overflow-hidden">
                {searchResults.playlists.slice(0, activeTab === 'all' ? 6 : 12).map((playlist) => (
                  <SearchPlaylistCard 
                    key={playlist.id} 
                    playlist={playlist} 
                    onClick={() => openPlaylist(playlist.id)} 
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Initial searching state (no results yet) */}
      {!searchResults && !isLoadingSearch && searchQuery && (
        <div className="flex flex-col items-center justify-center py-fib-89">
          <Loader2 size={34} className="animate-spin text-ios-blue mb-fib-13" />
          <p className="text-fib-13 text-ios-gray">Searching for "{searchQuery}"...</p>
        </div>
      )}
    </div>
  )
}
