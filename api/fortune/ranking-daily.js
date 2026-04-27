import { calcDayPillarRanking } from '../../src/logic/dayPillarRanking.js';

export const config = { runtime: 'edge' };

const LOGIC_VERSION = '1.0.0';
const VALID_CATEGORIES = ['total', 'love', 'work', 'money'];
const VALID_DIRECTIONS = ['desc', 'asc'];

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const dateStr = url.searchParams.get('date');
    const topParam = url.searchParams.get('top');
    const directionParam = url.searchParams.get('direction');

    // Validation: category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({
        error: `Invalid or missing 'category'. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Validation: date
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Response(JSON.stringify({
        error: "Invalid or missing 'date'. Must be YYYY-MM-DD format.",
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime()) || date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
      return new Response(JSON.stringify({
        error: "Invalid date value.",
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Validation: top
    const top = topParam ? parseInt(topParam, 10) : 3;
    if (isNaN(top) || top < 1 || top > 60) {
      return new Response(JSON.stringify({
        error: "'top' must be a number between 1 and 60.",
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Validation: direction
    const direction = directionParam || 'desc';
    if (!VALID_DIRECTIONS.includes(direction)) {
      return new Response(JSON.stringify({
        error: `Invalid 'direction'. Must be one of: ${VALID_DIRECTIONS.join(', ')}`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Calculate ranking
    const rankings = calcDayPillarRanking(category, date, { top, direction });

    return new Response(JSON.stringify({
      category,
      date: dateStr,
      direction,
      logic_version: LOGIC_VERSION,
      rankings,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // 1日キャッシュ（日付固定なので結果不変）
      },
    });
  } catch (error) {
    console.error('ranking-daily error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
