import React, { useState, useEffect, useRef } from 'react';
import { GameTable, LobbyPlayer, NetworkMessage } from './types';
import { NetworkSimulator } from './utils/networkSimulator';
import GameRoom from './components/GameRoom';

const ADMIN_PASSWORD = 'root';

const App: React.FC = () => {
  const [appState, setAppState] = useState<'LOGIN' | 'LOBBY' | 'GAME'>('LOGIN');
  const [nickname, setNickname] = useState('');
  const [userId] = useState(() => 'user-' + Math.floor(Math.random() * 100000));
  const [network, setNetwork] = useState<NetworkSimulator | null>(null);
  
  const [tables, setTables] = useState<GameTable[]>([]);
  const [activeTableId, setActiveTableId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      network?.cleanup();
    };
  }, [network]);

  useEffect(() => {
      if (appState === 'GAME' && activeTableId !== null && tables.length > 0) {
          const currentTable = tables[activeTableId];
          const amISeated = currentTable && currentTable.players.some(p => p?.id === userId);
          
          if (!amISeated) {
              alert("桌子数据已重置或您已被移除，返回大厅。");
              setActiveTableId(null);
              setAppState('LOBBY');
          }
      }
  }, [tables, appState, activeTableId, userId]);

  const handleLogin = () => {
    if (!nickname.trim()) return;
    const net = new NetworkSimulator(userId, nickname, (msg) => {
        if (msg.type === 'LOBBY_UPDATE') {
            // Updated logic: Use payload for reliable sync across devices
            if (msg.payload) {
                setTables(msg.payload);
                localStorage.setItem('tuosan_tables_v1', JSON.stringify(msg.payload));
            } else {
                const storageData = localStorage.getItem('tuosan_tables_v1');
                if (storageData) setTables(JSON.parse(storageData));
            }
        }
    });
    setNetwork(net);
    setTables(net.getTables());
    setAppState('LOBBY');
  };

  const handleSit = (tableId: number, seatIndex: number) => {
    if (!network) return;
    const success = network.sitDown(tableId, seatIndex);
    if (success) {
      setActiveTableId(tableId);
      setAppState('GAME');
    } else {
      alert("座位已被占用!");
    }
  };

  const handleExitGame = () => {
    network?.leaveTable();
    setActiveTableId(null);
    setAppState('LOBBY');
  };

  const handleGlobalClear = () => {
    requestAnimationFrame(() => {
        try {
            const pwd = window.prompt("请输入管理员密码 (重置所有数据):");
            if (pwd === null) return; 

            if (pwd === ADMIN_PASSWORD) {
                if (window.confirm("⚠️ 危险操作 ⚠️\n\n确定要重置所有桌子吗？\n所有正在进行的游戏都将强制结束。\n所有玩家将被踢出座位。")) {
                    // Use instance method if available or static + manual broadcast
                    if (network) {
                        network.resetSystem();
                    } else {
                        NetworkSimulator.resetAllData();
                    }
                    
                    const storageData = localStorage.getItem('tuosan_tables_v1');
                    if (storageData) {
                        setTables(JSON.parse(storageData));
                    }
                    
                    alert("系统已重置，所有桌子已清空。");
                }
            } else {
                alert("管理员密码错误！");
            }
        } catch (e) {
            console.error(e);
        }
    });
  };

  if (appState === 'LOGIN') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-green-900 text-white">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-96 text-center">
          <h1 className="text-4xl font-bold mb-8 text-yellow-400">拖三扑克</h1>
          <input 
            className="w-full p-3 mb-6 rounded text-black font-bold text-center text-xl"
            placeholder="请输入昵称"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold text-white text-xl transition shadow-md border-b-4 border-blue-800 active:border-b-0 active:mt-1 mb-4"
          >
            进入大厅
          </button>
          
          <button 
            onClick={handleGlobalClear}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold text-xl transition shadow-md border-b-4 border-red-800 active:border-b-0 active:mt-1 flex items-center justify-center gap-2"
          >
            🗑️ 清空桌面
          </button>
        </div>
      </div>
    );
  }

  if (appState === 'LOBBY' && network) {
    return (
      <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden flex flex-col">
        <div className="bg-gray-800 p-4 shadow flex justify-between items-center z-10 border-b border-gray-700">
           <div className="flex items-center gap-2">
             <h2 className="text-xl font-bold text-yellow-400">游戏大厅</h2>
             <span className="text-gray-300 flex items-center gap-2">
                | 玩家: {nickname} 
             </span>
           </div>
           <div className="flex items-center gap-3">
             <button 
                onClick={handleGlobalClear} 
                className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-700 px-3 py-1 rounded text-sm transition"
             >
                ⚠️ 重置系统
             </button>
             <button onClick={() => window.location.reload()} className="text-gray-300 hover:text-white border border-gray-600 px-3 py-1 rounded hover:bg-gray-700 transition">
                退出登录
             </button>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map(table => (
              <div key={table.id} className="bg-green-800 rounded-lg p-3 border-2 border-green-700 shadow relative hover:border-green-500 transition-colors flex flex-col gap-2">
                <div 
                    className="w-full flex justify-between items-center pb-2 border-b border-green-700/50 rounded p-1 text-left select-none relative z-20"
                >
                    <div className="flex flex-col">
                        <span className={`font-bold text-lg ${table.status === 'PLAYING' ? 'text-red-300' : 'text-green-200'}`}>
                            {table.status === 'PLAYING' ? '🔥 游戏中' : '🟢 等待中'}
                        </span>
                        <div className="text-xs text-green-400 font-mono">#{table.id + 1}</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {table.players.map((p, seatIdx) => (
                    <div key={seatIdx} className="flex flex-col h-10">
                       {p ? (
                         <div className="bg-blue-900 h-full flex items-center justify-center rounded text-sm font-bold truncate border border-blue-500 px-1 relative shadow-inner">
                           <span className="truncate max-w-full">{p.name}</span>
                           {table.hostId === p.id && <span className="text-yellow-400 ml-1 text-xs absolute top-0 right-0">★</span>}
                         </div>
                       ) : (
                         <button 
                            disabled={table.status === 'PLAYING'}
                            onClick={() => handleSit(table.id, seatIdx)}
                            className={`h-full rounded text-sm transition font-bold border 
                              ${table.status === 'PLAYING' 
                                ? 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed' 
                                : 'bg-green-700 hover:bg-green-600 text-green-100 border-green-600 shadow'
                              }`}
                         >
                           {table.status === 'PLAYING' ? '观战' : '入座'}
                         </button>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'GAME' && network && activeTableId !== null) {
      const table = tables[activeTableId];
      if (!table) return <div className="flex h-screen items-center justify-center text-white">房间数据同步中...</div>;
      
      return (
        <GameRoom 
          myUserId={userId}
          isHost={table.hostId === userId}
          network={network}
          tableId={activeTableId}
          initialPlayers={table.players}
          botsIndices={table.bots || []} 
          onExit={handleExitGame}
        />
      );
  }

  return <div>Error</div>;
};

export default App;