import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { countryById } from '../data';
import { flagAspect, flagUrl } from './Flag';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_PX = 8;

interface Point {
  x: number;
  y: number;
}

/** 「縦：横 = 2：3」のように、きりのよい比で書けるときはその形で。書けないときは「約○倍」で */
export function ratioLabel(aspect: number): string {
  if (aspect < 1) return '四角くない形';
  for (let h = 1; h <= 20; h++) {
    const w = Math.round(aspect * h);
    if (Math.abs(w / h - aspect) < 0.002) return `縦：横 = ${h}：${w}`;
  }
  return `横の長さは縦の約${aspect.toFixed(2)}倍`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** 国旗を画面いっぱいに出す。2本指で拡大（ピンチアウト）、1本指で移動、ダブルタップで拡大／元にもどす */
export function FlagViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const aspect = flagAspect(id);
  const country = countryById.get(id);
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [base, setBase] = useState(300);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ startView: typeof view; startPts: Point[]; moved: boolean } | null>(null);
  const lastTap = useRef(0);

  // 画面に収まるいちばん大きい幅を、もとの大きさ（拡大1倍）にする
  useEffect(() => {
    const fit = () => {
      const r = stageRef.current?.getBoundingClientRect();
      if (r) setBase(Math.min(r.width * 0.92, r.height * 0.8 * aspect));
    };
    fit();
    window.addEventListener('resize', fit);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
    };
  }, [aspect, onClose]);

  /** 画面の点 p（ステージの中心を0とする座標）を動かさないまま、拡大率を scale にする */
  const zoomAt = (from: typeof view, scale: number, p: Point) => {
    const s = clamp(scale, MIN_SCALE, MAX_SCALE);
    if (s <= MIN_SCALE + 0.01) return { scale: 1, x: 0, y: 0 };
    const k = s / from.scale;
    return { scale: s, x: p.x - (p.x - from.x) * k, y: p.y - (p.y - from.y) * k };
  };

  const toStage = (e: { clientX: number; clientY: number }): Point => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  const restart = (moved: boolean) => {
    gesture.current = { startView: view, startPts: [...pointers.current.values()], moved };
  };

  const onPointerDown = (e: PointerEvent) => {
    stageRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toStage(e));
    restart(pointers.current.size > 1);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, toStage(e));
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length >= 2 && g.startPts.length >= 2) {
      const scale = g.startView.scale * (dist(pts[0], pts[1]) / dist(g.startPts[0], g.startPts[1]));
      const m0 = mid(g.startPts[0], g.startPts[1]);
      const m1 = mid(pts[0], pts[1]);
      const z = zoomAt(g.startView, scale, m0);
      setView(z.scale === 1 ? z : { ...z, x: z.x + m1.x - m0.x, y: z.y + m1.y - m0.y });
      g.moved = true;
    } else if (pts.length === 1) {
      const dx = pts[0].x - g.startPts[0].x;
      const dy = pts[0].y - g.startPts[0].y;
      if (Math.hypot(dx, dy) > TAP_MOVE_PX) g.moved = true;
      if (g.startView.scale > 1) setView({ ...g.startView, x: g.startView.x + dx, y: g.startView.y + dy });
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // 2本指の1本をはなしたら、残りの指で続けて動かせるようにする
      restart(true);
      return;
    }
    gesture.current = null;
    if (!g || g.moved) return;
    const onFlag = (e.target as HTMLElement).classList.contains('viewer-flag');
    const now = Date.now();
    if (onFlag && now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setView(view.scale > 1 ? { scale: 1, x: 0, y: 0 } : zoomAt(view, 3, toStage(e)));
    } else if (onFlag) {
      lastTap.current = now;
    } else if (view.scale === 1) {
      onClose();
    }
  };

  const onWheel = (e: WheelEvent) => setView((v) => zoomAt(v, v.scale * Math.exp(-e.deltaY * 0.002), toStage(e)));

  return (
    <div className="viewer" role="dialog" aria-label={`${country?.name ?? ''}の国旗`}>
      <div
        ref={stageRef}
        className="viewer-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <img
          className="viewer-flag"
          src={flagUrl(id)}
          alt={country?.name ?? ''}
          draggable={false}
          style={{
            width: base * view.scale,
            aspectRatio: aspect,
            transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`,
          }}
        />
      </div>
      <div className="viewer-top">
        {view.scale > 1 && (
          <button className="btn small" onClick={() => setView({ scale: 1, x: 0, y: 0 })}>元の大きさ</button>
        )}
        <button className="btn primary" onClick={onClose}>✕ 閉じる</button>
      </div>
      <div className="viewer-info">
        <strong>{country?.name}</strong>
        <span>{ratioLabel(aspect)}</span>
        <span className="viewer-hint">2本の指で広げると大きくなるよ</span>
      </div>
    </div>
  );
}
