import { useState } from 'react';
import type { PlaylistItem, EpgSourceItem } from './App';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  // Playlist props
  playlists: PlaylistItem[];
  addPlaylist: (name: string, url: string) => void;
  deletePlaylist: (id: string) => void;
  setDefaultPlaylist: (id: string) => void;
  loadPlaylist: (playlist: PlaylistItem) => void;
  // EPG props
  epgSources: EpgSourceItem[];
  addEpgSource: (name: string, url: string) => void;
  deleteEpgSource: (id: string) => void;
  setDefaultEpgSource: (id: string) => void;
}

export function Settings({ 
    isOpen, 
    onClose, 
    playlists, 
    addPlaylist, 
    deletePlaylist, 
    setDefaultPlaylist, 
    loadPlaylist, 
    epgSources,
    addEpgSource,
    deleteEpgSource,
    setDefaultEpgSource
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState('playlists');

  // State for playlist form
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');

  // State for EPG form
  const [newEpgName, setNewEpgName] = useState('');
  const [newEpgUrl, setNewEpgUrl] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleAddPlaylist = () => {
    if (newPlaylistName && newPlaylistUrl) {
      addPlaylist(newPlaylistName, newPlaylistUrl);
      setNewPlaylistName('');
      setNewPlaylistUrl('');
    }
  };

  const handleAddEpg = () => {
    if (newEpgName && newEpgUrl) {
      addEpgSource(newEpgName, newEpgUrl);
      setNewEpgName('');
      setNewEpgUrl('');
    }
  };

  const handleLoadAndClose = (playlist: PlaylistItem) => {
    loadPlaylist(playlist);
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>设置</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body-columns">
            <aside className="settings-menu">
                <ul>
                    <li className={activeTab === 'playlists' ? 'active' : ''} onClick={() => setActiveTab('playlists')}>播放列表</li>
                    <li className={activeTab === 'epg' ? 'active' : ''} onClick={() => setActiveTab('epg')}>EPG 节目单</li>
                </ul>
            </aside>
            <main className="settings-content">
                {activeTab === 'playlists' && (
                    <>
                        <h3>添加新的播放列表</h3>
                        <div className="add-playlist-form">
                            <input
                            type="text"
                            placeholder="列表名称 (例如: 我的列表)"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            />
                            <input
                            type="text"
                            placeholder="列表 URL (.m3u 或 .txt)"
                            value={newPlaylistUrl}
                            onChange={(e) => setNewPlaylistUrl(e.target.value)}
                            />
                            <button onClick={handleAddPlaylist}>添加</button>
                        </div>

                        <h3>已保存的播放列表</h3>
                        <ul className="playlist-manage-list">
                            {playlists.map((p) => (
                            <li key={p.id}>
                                <span className="playlist-name">{p.name}{p.isDefault && ' (默认)'}</span>
                                <span className="playlist-url">{p.url}</span>
                                <div className="playlist-actions">
                                <button onClick={() => handleLoadAndClose(p)}>加载</button>
                                <button onClick={() => setDefaultPlaylist(p.id)} disabled={p.isDefault}>设为默认</button>
                                <button onClick={() => deletePlaylist(p.id)} className="delete-button">删除</button>
                                </div>
                            </li>
                            ))}
                        </ul>
                    </>
                )}
                {activeTab === 'epg' && (
                    <>
                        <h3>添加新的 EPG 源</h3>
                        <div className="add-playlist-form">
                            <input
                            type="text"
                            placeholder="EPG 名称 (例如: 我的节目单)"
                            value={newEpgName}
                            onChange={(e) => setNewEpgName(e.target.value)}
                            />
                            <input
                            type="text"
                            placeholder="EPG URL (.xml)"
                            value={newEpgUrl}
                            onChange={(e) => setNewEpgUrl(e.target.value)}
                            />
                            <button onClick={handleAddEpg}>添加</button>
                        </div>

                        <h3>已保存的 EPG 源</h3>
                        <ul className="playlist-manage-list">
                            {epgSources.map((epg) => (
                            <li key={epg.id}>
                                <span className="playlist-name">{epg.name}{epg.isDefault && ' (默认)'}</span>
                                <span className="playlist-url">{epg.url}</span>
                                <div className="playlist-actions">
                                <button onClick={() => setDefaultEpgSource(epg.id)} disabled={epg.isDefault}>设为默认</button>
                                <button onClick={() => deleteEpgSource(epg.id)} className="delete-button">删除</button>
                                </div>
                            </li>
                            ))}
                        </ul>
                    </>
                )}
            </main>
        </div>
      </div>
    </div>
  );
}
