import React, { useState, useRef, useEffect } from 'react';
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

const handleError = (error: any, message: string) => {
    console.error(message, error);
    if (message !== 'Failed to load EPG data in background') {
      setError(error.response?.data?.details || message);
    }
  }

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

  const showGuide = (channel: Channel) => {
    if (guideChannel && guideChannel.name === channel.name) {
        setGuideChannel(null); // Toggle off if same channel
    } else {
        setGuideChannel(channel);
    }
  };

  const closeGuide = () => {
    setGuideChannel(null);
  };

  const loadEpgDataInBackground = async (currentEpgSources?: EpgSourceItem[]) => {
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
  };

  const handleLoad = async (playlist: PlaylistItem, currentEpgSources?: EpgSourceItem[]) => {
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
    closeGuide(); // Close guide when loading new playlist

    console.log('Loading playlist:', playlist);
    try {
      const response = await axios.get(`http://localhost:3000/playlist`, { params: { url: playlist.url } });
      console.log('Playlist data:', response.data);
      setChannels(response.data);
      // EPG data is now loaded in the background, not blocking the UI
      loadEpgDataInBackground(currentEpgSources);
    } catch (err: any) {
      console.error('Failed to load playlist:', err);
      handleError(err, '加载播放列表失败。');
    }
    setLoading(false);
  };

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

  const playChannel = (channel: Channel) => {
    const originalStreamUrl = channel.url;
    const proxiedStreamUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(originalStreamUrl)}`;
    const baseUrl = originalStreamUrl.substring(0, originalStreamUrl.lastIndexOf('/') + 1);
    const hlsConfig = { baseUrl: baseUrl, fLoader: CustomFragmentLoader };

    setNowPlaying(channel.name);

    if (videoRef.current) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls(hlsConfig);
        hlsRef.current = hls;
        hls.loadSource(proxiedStreamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => console.error('视频播放被浏览器阻止。'));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            handleError(data, 'HLS.js 致命错误');
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = proxiedStreamUrl;
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play().catch(() => console.error('视频播放被浏览器阻止。'));
        });
      }
    }
  };

  const findCurrentProgram = (channel: Channel): Programme | null => {
    const channelEpg = processedEpgData[channel.name];
    if (!channelEpg) return null;

    const now = new Date();
    return channelEpg.find(prog => 
        new Date(prog.start) <= now &&
        new Date(prog.stop) > now
    ) || null;
  };

  const renderChannelList = () => (
    <aside className="channel-list-sidebar">
        <div className="playlist-sidebar-header">
            <PlaylistSwitcher playlists={playlists} currentPlaylistName={currentPlaylistName} onSelect={handleLoad} />
            <button onClick={toggleSidebar} className="sidebar-toggle-button" title={isSidebarCollapsed ? '展开' : '收起'}>
              {isSidebarCollapsed ? '»' : '«'}
            </button>
        </div>
        {loading ? <p style={{padding: '1rem'}}>加载中...</p> : <ul>
        {channels.map((channel, index) => {
            const currentProgram = findCurrentProgram(channel);
            const isGuideOpenForThisChannel = guideChannel?.name === channel.name;
            return (
            <li key={index} onClick={() => playChannel(channel)} className={nowPlaying === channel.name ? 'playing' : ''}>
                <div className="channel-logo-container">
                    <img src={channel.tvg.logo} alt={channel.name} />
                </div>
                <div className="channel-info">
                    <span>{channel.name}</span>
                    <small className="current-program"><span style={{display: 'inline-block'}}>{currentProgram?.title || ' ' }</span></small>
                </div>
                <button className="guide-button" title="节目单" onClick={(e) => { e.stopPropagation(); showGuide(channel); }}>
                    {isGuideOpenForThisChannel ? '«' : '»'}
                </button>
            </li>
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
            {!nowPlaying && (
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
        {guideChannel && <GuidePanel channel={guideChannel} epgData={processedEpgData[guideChannel.name]} onClose={closeGuide} />}
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