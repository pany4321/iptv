import React, { useState } from 'react';
import type { PlaylistItem } from './App';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: PlaylistItem[];
  addPlaylist: (name: string, url: string) => void;
  deletePlaylist: (id: string) => void;
  setDefaultPlaylist: (id: string) => void;
  loadPlaylist: (playlist: PlaylistItem) => void;
}

export function Settings({ isOpen, onClose, playlists, addPlaylist, deletePlaylist, setDefaultPlaylist, loadPlaylist }: SettingsProps) {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [activeTab, setActiveTab] = useState('playlists');

  if (!isOpen) {
    return null;
  }

  const handleAdd = () => {
    if (newName && newUrl) {
      addPlaylist(newName, newUrl);
      setNewName('');
      setNewUrl('');
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
                    <li className="disabled">EPG 节目单 (即将推出)</li>
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
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            />
                            <input
                            type="text"
                            placeholder="列表 URL (.m3u 或 .txt)"
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            />
                            <button onClick={handleAdd}>添加</button>
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
            </main>
        </div>
      </div>
    </div>
  );
}