import React, { useState, useRef, useEffect } from 'react';
import type { PlaylistItem } from './App';

interface PlaylistSwitcherProps {
  playlists: PlaylistItem[];
  currentPlaylistName: string | null;
  onSelect: (playlist: PlaylistItem) => void;
}

export const PlaylistSwitcher: React.FC<PlaylistSwitcherProps> = ({ playlists, currentPlaylistName, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (playlist: PlaylistItem) => {
    onSelect(playlist);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="playlist-switcher-container" ref={containerRef}>
      <button className="playlist-switcher-button" onClick={() => setIsOpen(!isOpen)}>
        <span>{currentPlaylistName || '选择播放列表'}</span>
        <span className="arrow">▼</span>
      </button>
      {isOpen && (
        <ul className="playlist-switcher-dropdown">
          {playlists.map(p => (
            <li key={p.id} onClick={() => handleSelect(p)}>
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaylistSwitcher;