import { useState } from 'react'
import { Play, Music } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { AlbumItem } from '../api/youtube'

interface AlbumCardProps {
  album: AlbumItem
}

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

export default function AlbumCard({ album }: AlbumCardProps) {
  const { darkMode, openAlbum } = useAppStore()
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleClick = () => {
    openAlbum(album.id)
  }

  const showFallback = !album.thumbnail || imgError

  return (
    <div
      onClick={handleClick}
      className={`p-fib-13 rounded-fib-13 cursor-pointer ios-transition group flex-shrink-0 w-[160px]
        ${darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
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
        <div className="absolute bottom-fib-8 right-fib-8 w-fib-34 h-fib-34 rounded-full bg-ios-blue flex items-center justify-center shadow-ios-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ios-transition">
          <Play size={16} fill="white" className="text-white ml-0.5" />
        </div>
      </div>
      <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
        {album.title}
      </p>
      <p className="text-fib-13 text-ios-gray truncate">
        {album.artists?.map(a => a.name).join(', ') || (album.year ? `${album.year}` : 'Album')}
      </p>
    </div>
  )
}
