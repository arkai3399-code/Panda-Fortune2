import React from 'react';

// ── パンダアイコン SVG（インライン）──
// 元HTML 5566-5592行。
export const PANDA_SVG_INLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="1em" height="1em" style="vertical-align:-0.15em;display:inline-block;">
  <!-- 耳（薄茶色） -->
  <circle cx="10" cy="11" r="6" fill="#C4956A"/>
  <circle cx="30" cy="11" r="6" fill="#C4956A"/>
  <!-- 耳の内側（薄め） -->
  <circle cx="10" cy="11" r="3.5" fill="#E8C49A"/>
  <circle cx="30" cy="11" r="3.5" fill="#E8C49A"/>
  <!-- 顔（オフホワイト） -->
  <circle cx="20" cy="21" r="15" fill="#F7F3EE"/>
  <circle cx="20" cy="21" r="15" fill="none" stroke="#E8DDD0" stroke-width="0.5"/>
  <!-- 目パッチ（薄茶色） -->
  <ellipse cx="14" cy="18" rx="4.5" ry="4" fill="#C4956A"/>
  <ellipse cx="26" cy="18" rx="4.5" ry="4" fill="#C4956A"/>
  <!-- 目（ダークブラウン） -->
  <circle cx="14" cy="18" r="2.2" fill="#3D2B1F"/>
  <circle cx="26" cy="18" r="2.2" fill="#3D2B1F"/>
  <!-- 目のハイライト -->
  <circle cx="15" cy="17" r="0.8" fill="white"/>
  <circle cx="27" cy="17" r="0.8" fill="white"/>
  <!-- 鼻 -->
  <ellipse cx="20" cy="23.5" rx="2.5" ry="1.8" fill="#A0705A"/>
  <!-- 口 -->
  <path d="M17.5 25.5 Q20 27.5 22.5 25.5" stroke="#A0705A" stroke-width="1" fill="none" stroke-linecap="round"/>
  <!-- ほっぺ -->
  <circle cx="12" cy="25" r="3" fill="#E8B4A0" opacity="0.4"/>
  <circle cx="28" cy="25" r="3" fill="#E8B4A0" opacity="0.4"/>
</svg>`;

// 絵文字 🐼 を置換するための img タグ（data URI）。
// 元HTML 5601行 PANDA_IMG_HTML。
export const PANDA_IMG_HTML = '<img src="data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 40 40%22%3E%3Ccircle cx%3D%2210%22 cy%3D%2211%22 r%3D%226%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2230%22 cy%3D%2211%22 r%3D%226%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2210%22 cy%3D%2211%22 r%3D%223.5%22 fill%3D%22%23E8C49A%22%2F%3E%3Ccircle cx%3D%2230%22 cy%3D%2211%22 r%3D%223.5%22 fill%3D%22%23E8C49A%22%2F%3E%3Ccircle cx%3D%2220%22 cy%3D%2221%22 r%3D%2215%22 fill%3D%22%23F7F3EE%22%2F%3E%3Cellipse cx%3D%2214%22 cy%3D%2218%22 rx%3D%224.5%22 ry%3D%224%22 fill%3D%22%23C4956A%22%2F%3E%3Cellipse cx%3D%2226%22 cy%3D%2218%22 rx%3D%224.5%22 ry%3D%224%22 fill%3D%22%23C4956A%22%2F%3E%3Ccircle cx%3D%2214%22 cy%3D%2218%22 r%3D%222.2%22 fill%3D%22%233D2B1F%22%2F%3E%3Ccircle cx%3D%2226%22 cy%3D%2218%22 r%3D%222.2%22 fill%3D%22%233D2B1F%22%2F%3E%3Ccircle cx%3D%2215%22 cy%3D%2217%22 r%3D%220.8%22 fill%3D%22white%22%2F%3E%3Ccircle cx%3D%2227%22 cy%3D%2217%22 r%3D%220.8%22 fill%3D%22white%22%2F%3E%3Cellipse cx%3D%2220%22 cy%3D%2223.5%22 rx%3D%222.5%22 ry%3D%221.8%22 fill%3D%22%23A0705A%22%2F%3E%3Cpath d%3D%22M17.5 25.5 Q20 27.5 22.5 25.5%22 stroke%3D%22%23A0705A%22 stroke-width%3D%221%22 fill%3D%22none%22%2F%3E%3C%2Fsvg%3E" width="18" height="18" style="vertical-align:-0.1em;display:inline-block" alt=""/>';

// 元HTML 5594-5599行。
export default function PandaIcon({ size = 28 }) {
  return (
    <span
      style={{ display: 'inline-block', width: size, height: size, flexShrink: 0, lineHeight: 1 }}
      dangerouslySetInnerHTML={{
        __html: PANDA_SVG_INLINE.replace('width="1em" height="1em"', `width="${size}" height="${size}"`),
      }}
    />
  );
}
