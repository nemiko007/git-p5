import { useEffect, useState } from 'react'
import './App.css'

interface MonsterStatus {
  status: 'HUNGRY' | 'SATISFIED';
  anger_level: number;
  last_check: string;
}

function App() {
  const [status, setStatus] = useState<MonsterStatus | null>(null);

  useEffect(() => {
    // Get initial status
    chrome.storage.local.get(['monsterStatus'], (result: { [key: string]: any }) => {
      if (result.monsterStatus) {
        setStatus(result.monsterStatus);
      }
    });

    // Listen for updates
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.monsterStatus) {
        setStatus(changes.monsterStatus.newValue as MonsterStatus);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return (
    <div className="container">
      <h1 className="title">Grass Reaper</h1>

      {!status ? (
        <p>Loading status...</p>
      ) : (
        <div className="status-card">
          <div className={`status-icon ${status.status.toLowerCase()}`}></div>
          <p className="status-text">
            Status: <span className="highlight">{status.status}</span>
          </p>
          <div className="anger-container">
            <p>Anger Level:</p>
            <div className="anger-bar-bg">
              <div
                className="anger-bar-fill"
                style={{ width: `${status.anger_level}%` }}
              ></div>
            </div>
            <p className="anger-value">{status.anger_level}%</p>
          </div>
          <p className="last-check">
            Last Check: {new Date(status.last_check).toLocaleString()}
          </p>
        </div>
      )}

      {status?.status === 'HUNGRY' && (
        <p className="warning">Go commit something before the grass consumes you!</p>
      )}
    </div>
  )
}

export default App
