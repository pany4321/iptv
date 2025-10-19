import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Hls from 'hls.js';
import { Settings } from './Settings';
import { GuidePanel } from './GuidePanel';
import { PlaylistSwitcher } from './PlaylistSwitcher';
import { v4 as uuidv4 } from 'uuid';

// --- Data Structures ---
export interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  isDefault: boolean;
}

export interface EpgSourceItem {
    id: string;
    name: string;
    url: string;
    isDefault: boolean;
}

export interface Channel {
  name: string;
  tvg: { id: string; name: string; logo: string; url: string; rec: string; };
  url: string;
  group: { title: string; };
}

export interface Programme {
    channel: string;
    title: string;
    description: string;
    start: string; // ISO 8601 date string
    stop: string;  // ISO 8601 date string
}

import { CustomFragmentLoader } from './hlsLoader';

// --- Helper Functions (outside component for stability) ---
const processEpgData = (programmes: Programme[]) => {
    const epgByChannel: { [key: string]: Programme[] } = {};
    for (const programme of programmes) {
        if (!epgByChannel[programme.channel]) {
            epgByChannel[programme.channel] = [];
        }
        epgByChannel[programme.channel].push(programme);
    }
    return epgByChannel;
};

const placeholderLogo = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent pixel

// --- Memoized Channel List Item Component ---
const ChannelListItem = React.memo(({
    channel,
    isPlaying,
    isGuideOpen,
    currentProgram,
    logoUrl,
    onPlay,
    onShowGuide
}: {
    channel: Channel;
    isPlaying: boolean;
    isGuideOpen: boolean;
    currentProgram: Programme | null;
    logoUrl: string;
    onPlay: (channel: Channel) => void;
    onShowGuide: (channel: Channel) => void;
}) => {
    return (
        <li onClick={() => onPlay(channel)} className={isPlaying ? 'playing' : ''}>
            <div className="channel-logo-container">
                <img 
                    src={logoUrl || placeholderLogo} 
                    alt={channel.name}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = placeholderLogo;
                    }}
                />
            </div>
            <div className="channel-info">
                <span>{channel.name}</span>
                <small className="current-program"><span style={{display: 'inline-block'}}>{currentProgram?.title || ' ' }</span></small>
            </div>
            <button className="guide-button" title="节目单" onClick={(e) => { e.stopPropagation(); onShowGuide(channel); }}>
                {isGuideOpen ? '«' : '»'}
            </button>
        </li>
    );
});

function App() {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [epgSources, setEpgSources] = useState<EpgSourceItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [processedEpgData, setProcessedEpgData] = useState<{ [key: string]: Programme[] }>({});
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [guideChannel, setGuideChannel] = useState<Channel | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const handleError = (error: any, message: string) => {
    console.error(message, error);
    if (message !== 'Failed to load EPG data in background') {
      setError(error.response?.data?.details || message);
    }
  }

  // --- Performance Optimizations ---
  const sortedEpgKeys = useMemo(() => {
    return Object.keys(processedEpgData).sort((a, b) => b.length - a.length);
  }, [processedEpgData]);

  // --- EPG Fuzzy Matching Helpers ---
  const findEpgForChannel = useCallback((
    channel: Channel | null,
  ): Programme[] | undefined => {
    if (!channel) return undefined;

    if (processedEpgData[channel.name]) {
      return processedEpgData[channel.name];
    }

    const channelNameLower = channel.name.toLowerCase();
    const matchingEpgKey = sortedEpgKeys.find(epgKey => channelNameLower.includes(epgKey.toLowerCase()));

    if (matchingEpgKey) {
      return processedEpgData[matchingEpgKey];
    }

    return undefined;
  }, [processedEpgData, sortedEpgKeys]);

  useEffect(() => {
    const savedPlaylists: PlaylistItem[] = JSON.parse(localStorage.getItem('playlists') || '[]');
    setPlaylists(savedPlaylists);

    const savedEpgSources: EpgSourceItem[] = JSON.parse(localStorage.getItem('epgSources') || '[]');
    setEpgSources(savedEpgSources);

    const defaultPlaylist = savedPlaylists.find(p => p.isDefault);
    if (defaultPlaylist) {
      handleLoad(defaultPlaylist, savedEpgSources);
    } else if (savedPlaylists.length > 0) {
      handleLoad(savedPlaylists[0], savedEpgSources);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.className = theme + '-theme';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const showGuide = useCallback((channel: Channel) => {
    if (guideChannel && guideChannel.name === channel.name) {
        setGuideChannel(null);
    } else {
        setGuideChannel(channel);
    }
  }, [guideChannel]);

  const closeGuide = useCallback(() => {
    setGuideChannel(null);
  }, []);

  const loadEpgDataInBackground = useCallback(async (currentEpgSources?: EpgSourceItem[]) => {
    const sources = currentEpgSources || epgSources;
    const defaultEpg = sources.find(epg => epg.isDefault);

    if (defaultEpg) {
        try {
            const epgResponse = await axios.get(`http://localhost:3000/epg`, { params: { url: defaultEpg.url } });
            setProcessedEpgData(processEpgData(epgResponse.data.programmes));
        } catch (epgErr: any) {
            handleError(epgErr, 'Failed to load EPG data in background');
        }
    }
  }, [epgSources]);

  const handleLoad = useCallback(async (playlist: PlaylistItem, currentEpgSources?: EpgSourceItem[]) => {
    if (!playlist || !playlist.url) {
      setError('无效的播放列表。');
      return;
    }
    setError(null);
    setLoading(true);
    setChannels([]);
    setProcessedEpgData({});
    setNowPlaying(null);
    setCurrentPlaylistName(playlist.name);
    closeGuide();

    console.log('Loading playlist:', playlist);
    try {
      const response = await axios.get(`http://localhost:3000/playlist`, { params: { url: playlist.url } });
      setChannels(response.data);
      loadEpgDataInBackground(currentEpgSources);
    } catch (err: any) {
      console.error('Failed to load playlist:', err);
      handleError(err, '加载播放列表失败。');
    }
    setLoading(false);
  }, [closeGuide, loadEpgDataInBackground]);

  // --- Playlist Management ---
  const savePlaylists = (newPlaylists: PlaylistItem[]) => {
    setPlaylists(newPlaylists);
    localStorage.setItem('playlists', JSON.stringify(newPlaylists));
  }

  const addPlaylist = (name: string, url: string) => {
    const newPlaylist: PlaylistItem = { id: uuidv4(), name, url, isDefault: playlists.length === 0 };
    const updatedPlaylists = [...playlists, newPlaylist];
    savePlaylists(updatedPlaylists);
  };

  const deletePlaylist = (id: string) => {
    const updatedPlaylists = playlists.filter(p => p.id !== id);
    savePlaylists(updatedPlaylists);
  };

  const setDefaultPlaylist = (id: string) => {
    const updatedPlaylists = playlists.map(p => ({ ...p, isDefault: p.id === id }));
    savePlaylists(updatedPlaylists);
  };

  // --- EPG Management ---
  const saveEpgSources = (newEpgs: EpgSourceItem[]) => {
    setEpgSources(newEpgs);
    localStorage.setItem('epgSources', JSON.stringify(newEpgs));
  }

  const addEpgSource = (name: string, url: string) => {
    const newEpg: EpgSourceItem = { id: uuidv4(), name, url, isDefault: epgSources.length === 0 };
    const updatedEpgs = [...epgSources, newEpg];
    saveEpgSources(updatedEpgs);
  };

  const deleteEpgSource = (id: string) => {
    const updatedEpgs = epgSources.filter(epg => epg.id !== id);
    saveEpgSources(updatedEpgs);
  };

  const setDefaultEpgSource = (id: string) => {
    const updatedEpgs = epgSources.map(epg => ({ ...epg, isDefault: epg.id === id }));
    saveEpgSources(updatedEpgs);
  };

  const playChannel = useCallback((channel: Channel) => {
    const originalStreamUrl = channel.url;
    const proxiedStreamUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(originalStreamUrl)}`;
    const baseUrl = originalStreamUrl.substring(0, originalStreamUrl.lastIndexOf('/') + 1);
    const hlsConfig = {
      ...{ baseUrl: baseUrl, fLoader: CustomFragmentLoader },
      liveSyncDurationCount: 1, // Keep only 1 segment from the live edge
      liveMaxLatencyDurationCount: 2, // Jump to live if latency is > 2 segments
    };
    const BLANK_VIDEO_SRC = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
        video.pause();
        video.src = BLANK_VIDEO_SRC;
        video.load();
    }

    if (video) {
      setTimeout(() => {
        if (Hls.isSupported()) {
          const hls = new Hls(hlsConfig as any);
          hlsRef.current = hls;
          hls.loadSource(proxiedStreamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setNowPlaying(channel.name);
            video.play().catch(() => console.error('视频播放被浏览器阻止。'));
          });
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('HLS.js: fatal network error encountered, try to recover', data);
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('HLS.js: fatal media error encountered, try to recover', data);
                  hls.recoverMediaError();
                  break;
                default:
                  console.error('HLS.js: unrecoverable fatal error', data);
                  hls.destroy();
                  handleError(data, 'HLS.js 致命错误');
                  break;
              }
            } else {
              console.warn('HLS.js: non-fatal error', data);
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          setNowPlaying(channel.name);
          video.src = proxiedStreamUrl;
          video.play().catch(() => console.error('视频播放被浏览器阻止。'));
        }
      }, 50);
    }
  }, []);

  const findCurrentProgram = useCallback((channel: Channel): Programme | null => {
    const channelEpg = findEpgForChannel(channel);
    if (!channelEpg) return null;

    const now = new Date();

    const currentProgram = channelEpg.find(prog => 
        new Date(prog.start) <= now &&
        new Date(prog.stop) > now
    );
    if (currentProgram) {
        return currentProgram;
    }

    const NEXT_PROGRAM_THRESHOLD_MS = 15 * 60 * 1000;
    const nextProgram = channelEpg
      .filter(prog => new Date(prog.start) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .find(prog => (new Date(prog.start).getTime() - now.getTime()) < NEXT_PROGRAM_THRESHOLD_MS);

    return nextProgram || null;
  }, [findEpgForChannel]);

  const renderChannelList = () => (
    <aside className="channel-list-sidebar">
        <div className="playlist-sidebar-header">
            <PlaylistSwitcher playlists={playlists} currentPlaylistName={currentPlaylistName} onSelect={handleLoad} />
            <button onClick={toggleSidebar} className="sidebar-toggle-button" title={isSidebarCollapsed ? '展开' : '收起'}>
              {isSidebarCollapsed ? '»' : '«'}
            </button>
        </div>
        {loading ? <p style={{padding: '1rem'}}>加载中...</p> : <ul>
        {channels.map((channel) => {
            const currentProgram = findCurrentProgram(channel);
            const isGuideOpenForThisChannel = guideChannel?.name === channel.name;
            
            let logoUrl = channel.tvg.logo;
            if (!logoUrl) {
                const epgForChannel = findEpgForChannel(channel);
                const epgChannelId = epgForChannel?.[0]?.channel;
                if (epgChannelId) {
                    logoUrl = `https://gh.195656.xyz/https://github.com/fanmingming/live/blob/main/tv/${epgChannelId}.png`;
                }
            }

            return (
                <ChannelListItem
                    key={channel.url} 
                    channel={channel}
                    isPlaying={nowPlaying === channel.name}
                    isGuideOpen={isGuideOpenForThisChannel}
                    currentProgram={currentProgram}
                    logoUrl={logoUrl}
                    onPlay={playChannel}
                    onShowGuide={showGuide}
                />
            )
        })}
        </ul>}
    </aside>
  );

  return (
    <div className={`App ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="App-header">
        <div className="title-bar">
          <h1>IPTV 播放器</h1>
        </div>
        <div className="header-status-message">
            {error && <p className="error-message">错误: {error}</p>}
            {!error && !nowPlaying && (
                <p>{playlists.length === 0 && !loading ? '请点击右上角设置按钮，添加您的第一个播放列表。' : '请选择一个频道进行播放'}</p>
            )}
        </div>
        <div className="header-buttons">
            <button onClick={() => setIsSettingsOpen(true)} className="theme-toggle-button" title="设置">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button onClick={toggleTheme} className="theme-toggle-button" title="切换主题">
            {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
            </button>
        </div>
      </header>
      <main className="App-main">
        {renderChannelList()}
        {guideChannel && <GuidePanel channel={guideChannel} epgData={findEpgForChannel(guideChannel)} onClose={closeGuide} />}
        <section className="player-section">
          <video ref={videoRef} controls width="100%" height="100%" />
          {!nowPlaying && (
            <div className="player-placeholder">
              {/* This is now empty, message moved to header */}
            </div>
          )}
        </section>
      </main>
      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        playlists={playlists}
        addPlaylist={addPlaylist}
        deletePlaylist={deletePlaylist}
        setDefaultPlaylist={setDefaultPlaylist}
        loadPlaylist={(p) => handleLoad(p)}
        epgSources={epgSources}
        addEpgSource={addEpgSource}
        deleteEpgSource={deleteEpgSource}
        setDefaultEpgSource={setDefaultEpgSource}
      />
    </div>
  );
}

export default App;