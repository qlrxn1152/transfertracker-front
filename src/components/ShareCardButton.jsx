import { useState } from 'react';

function wrap(context, value, maxWidth) {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export default function ShareCardButton({ item, compact = false, onStatus }) {
  const [busy, setBusy] = useState(false);

  async function create(event) {
    event.stopPropagation();
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const context = canvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, '#0a1213');
      gradient.addColorStop(1, '#1b3027');
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = 'rgba(216,245,157,.22)';
      context.lineWidth = 2;
      context.strokeRect(34, 34, 1132, 562);
      context.fillStyle = '#d8f59d';
      context.font = '800 26px system-ui, sans-serif';
      context.fillText('VEYRO  ·  TRANSFER INTELLIGENCE', 82, 104);
      context.fillStyle = '#f5f7f1';
      context.font = '800 58px system-ui, sans-serif';
      const title = wrap(context, item.title, 1020);
      title.forEach((line, index) => context.fillText(line, 82, 205 + index * 72));
      context.fillStyle = '#b5c2bb';
      context.font = '400 28px system-ui, sans-serif';
      const summary = wrap(context, item.summary, 1000);
      summary.forEach((line, index) => context.fillText(line, 82, 455 + index * 37));
      context.fillStyle = '#d8f59d';
      context.font = '700 24px system-ui, sans-serif';
      context.fillText('transfertracker-web.vercel.app', 82, 550);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('카드를 만들지 못했습니다.');
      const file = new File([blob], 'veyro-transfer-card.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: item.title, text: item.summary || item.title, files: [file] });
        onStatus?.('카드 공유 완료');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'veyro-transfer-card.png';
        link.click();
        URL.revokeObjectURL(url);
        onStatus?.('카드 이미지 저장됨');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') onStatus?.('카드를 만들지 못했습니다');
    } finally {
      setBusy(false);
    }
  }

  return <button className={`share-card-button ${compact ? 'compact' : ''}`} type="button" onClick={create} disabled={busy}>{busy ? '생성 중' : '카드'}</button>;
}
