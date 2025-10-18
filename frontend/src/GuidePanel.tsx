import React, { useRef, useEffect } from 'react';
import type { Channel, Programme } from './App';

interface GuidePanelProps {
  channel: Channel | null;
  epgData: Programme[] | undefined;
  onClose: () => void;
}

export function GuidePanel({ channel, epgData, onClose }: GuidePanelProps) {
  const currentProgramRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (currentProgramRef.current) {
      currentProgramRef.current.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
    }
  }, [channel]); // Scroll when channel changes

  if (!channel) {
    return null;
  }

  const getTodaySPrograms = () => {
    if (!epgData) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return epgData
      .filter(prog => {
        const progStart = new Date(prog.start);
        return progStart >= today && progStart < tomorrow;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  };

  const programs = getTodaySPrograms();

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const isCurrent = (start: string, stop: string) => {
    const now = new Date();
    return new Date(start) <= now && new Date(stop) > now;
  }

  const isPast = (stop: string) => {
    return new Date(stop) < new Date();
  }

  return (
    <div className="guide-panel">
        <div className="guide-panel-header">
          <h3>{channel.name}</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="guide-panel-content">
          {programs.length > 0 ? (
            <ul>
              {programs.map((prog, index) => {
                const isCurrentProgram = isCurrent(prog.start, prog.stop);
                return (
                    <li 
                        key={index} 
                        ref={isCurrentProgram ? currentProgramRef : null}
                        className={`
                            ${isCurrentProgram ? 'current' : ''}
                            ${isPast(prog.stop) ? 'past' : ''}
                        `}
                    >
                        <span className="program-time">{formatTime(prog.start)}</span>
                        <span className="program-title">{prog.title}</span>
                    </li>
                )
              })}
            </ul>
          ) : (
            <p style={{padding: '1rem'}}>该频道暂无今日节目单。</p>
          )}
        </div>
    </div>
  );
}
