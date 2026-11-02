import { useState } from 'react';
import { KanaKeyboard } from '../components/KanaKeyboard';
import { Flag } from '../components/Flag';
import type { User } from '../types';

interface Props {
  users: User[];
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
}

export function UserSelect({ users, onSelect, onAdd, onDelete }: Props) {
  const [adding, setAdding] = useState(users.length === 0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  if (adding) {
    const submit = () => {
      const n = name.trim();
      if (!n) return;
      onAdd(n);
      setName('');
      setAdding(false);
    };
    return (
      <div className="screen add-user">
        <h1 className="title-sm">名前を入れてね</h1>
        <div className="answer-box">{name || <span className="placeholder">名前</span>}</div>
        <KanaKeyboard value={name} onChange={setName} onSubmit={submit} submitLabel="登録" maxLength={10} allowHiragana />
        {users.length > 0 && (
          <button className="btn ghost" onClick={() => setAdding(false)}>もどる</button>
        )}
      </div>
    );
  }

  return (
    <div className="screen user-select">
      <div className="hero">
        <div className="hero-flags">
          {['JP', 'FR', 'BR', 'KE', 'AU'].map((id) => <Flag key={id} id={id} className="hero-flag" />)}
        </div>
        <h1 className="title">国旗検定 練習</h1>
        <p className="subtitle">だれが練習する？</p>
      </div>
      <div className="user-list">
        {users.map((u) => (
          <div key={u.id} className="user-row">
            <button className="btn big user-btn" onClick={() => onSelect(u.id)} disabled={editing}>
              {u.name}
            </button>
            {editing && (
              <button
                className="btn danger round"
                aria-label={`${u.name}を消す`}
                onClick={() => {
                  if (confirm(`「${u.name}」を消しますか？\n記録も全部消えます。`)) onDelete(u.id);
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="row">
        <button className="btn" onClick={() => setAdding(true)}>＋ 新しく登録</button>
        {users.length > 0 && (
          <button className="btn ghost" onClick={() => setEditing(!editing)}>{editing ? '終わる' : '編集'}</button>
        )}
      </div>
    </div>
  );
}
