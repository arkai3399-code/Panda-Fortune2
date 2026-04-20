// ══════════════════════════════════════════════════════════════
//  PANDA FORTUNE — 命式ビルダー
//  元HTML 2149-2184行の buildMeishiki(calc, ui)。
//
//  calcMeishiki() の計算結果（calc）と UI 入力（ui）を受け取って、
//  画面表示用の整形済み「命式オブジェクト」を返す純粋関数。
//  React 側はこの結果をそのまま props に流し込む。
// ══════════════════════════════════════════════════════════════

const HOUR_SHI = ['子','子','丑','丑','寅','寅','卯','卯','辰','辰','巳','巳','午','午','未','未','申','申','酉','酉','戌','戌','亥','亥'];

function _bmLang() {
  if (typeof window !== 'undefined' && window.PF_LANG && window.PF_LANG.getLang) {
    return window.PF_LANG.getLang();
  }
  return 'jp';
}

/**
 * @param {ReturnType<import('../engines/meishikiEngine.js').calcMeishiki>} calc
 * @param {Object} ui - fortune_input 相当
 * @returns {Object} 表示用命式オブジェクト
 */
export function buildMeishiki(calc, ui) {
  const p = calc.pillars;
  const _lang = _bmLang();
  const isKr = _lang === 'kr';
  const corrH = Math.floor(calc.input.correctedHour);
  const corrM = Math.round((calc.input.correctedHour - corrH) * 60);
  const corrSuffixJa = `（${calc.input.correctionMin > 0 ? '+' : ''}${calc.input.correctionMin}분 보정）`;
  const corrSuffixKo = ` (${calc.input.correctionMin > 0 ? '+' : ''}${calc.input.correctionMin}분 보정)`;
  const corrStr = calc.input.correctionMin !== 0
    ? `${corrH}:${String(corrM).padStart(2, '0')}${isKr ? corrSuffixKo : `（${calc.input.correctionMin > 0 ? '+' : ''}${calc.input.correctionMin}分補正）`}`
    : `${corrH}:${String(corrM).padStart(2, '0')}`;
  const hourStr = ui.hourInput >= 0
    ? (isKr ? `${HOUR_SHI[ui.hourInput]}시` : `${HOUR_SHI[ui.hourInput]}の刻`)
    : (isKr ? '시간 불명' : '時間不明');

  return {
    name: { last: ui.lastName || '', first: ui.firstName || '' },
    birthDate: isKr ? `${ui.year}년 ${ui.month}월 ${ui.day}일` : `${ui.year}年${ui.month}月${ui.day}日`,
    birthTime: hourStr,
    birthPlace: isKr ? `${ui.placeName || ''}・동경 ${ui.longitude}°` : `${ui.placeName || ''}・東経${ui.longitude}°`,
    correctedTime: corrStr,
    gender: isKr ? (ui.gender === 'f' ? '여성' : '남성') : (ui.gender === 'f' ? '女性' : '男性'),
    mbti: ui.mbti || '',
    nichi: { kan: p.day.kan, shi: p.day.shi },
    pillars: ['year', 'month', 'day', 'hour'].filter((k) => p[k]).map((k) => ({
      label: p[k].label,
      kan: p[k].kan,
      shi: p[k].shi,
      jisshin: k === 'day' ? '─' : p[k].jisshin.replace('─（日主）', '─'),
      unsei: p[k].juniunsei,
    })),
    zokan: ['year', 'month', 'day', 'hour'].filter((k) => p[k]).map((k) => ({
      shi: p[k].shi,
      zokan: p[k].zokan,
    })),
    gokyo: {
      moku: calc.gokyo['木'] || 0,
      hi:   calc.gokyo['火'] || 0,
      do:   calc.gokyo['土'] || 0,
      kin:  calc.gokyo['金'] || 0,
      sui:  calc.gokyo['水'] || 0,
    },
    kakukyoku: calc.kakukyoku.name,
    kishin: [...calc.kishin],
    kijin:  [...calc.kijin],
    nikishin: {
      ki:  calc.kishin.join('・') + (isKr ? '(희신)' : '（喜神）'),
      ki2: calc.kijin.join('・')  + (isKr ? '(기신)' : '（忌神）'),
    },
    tokuseiboshi: calc.tokuseiboshi,
    daiunList: calc.daiunList.map((d) => ({
      age: isKr ? `${d.ageFrom}~${d.ageTo}세` : `${d.ageFrom}〜${d.ageTo}歳`,
      kan: d.kan,
      shi: d.shi,
    })),
    _calc: calc,
    _ui: ui,
  };
}
