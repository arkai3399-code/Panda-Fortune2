import { calcDayPillarRankingMonthly } from '../../src/logic/dayPillarRanking.js';

export const config = { runtime: 'edge' };

const LOGIC_VERSION = '1.0.0';
const VALID_CATEGORIES = ['total', 'love', 'work', 'money'];
const VALID_DIRECTIONS = ['desc', 'asc'];

export default async function handler(req) {
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
    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
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

    // Validation: year
    const year = yearParam ? parseInt(yearParam, 10) : NaN;
    if (isNaN(year) || year < 2020 || year > 2030) {
      return new Response(JSON.stringify({
        error: "Invalid or missing 'year'. Must be a number between 2020 and 2030.",
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Validation: month
    const month = monthParam ? parseInt(monthParam, 10) : NaN;
    if (isNaN(month) || month < 1 || month > 12) {
      return new Response(JSON.stringify({
        error: "Invalid or missing 'month'. Must be a number between 1 and 12.",
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

    const rankings = calcDayPillarRankingMonthly(category, year, month, { top, direction });

    return new Response(JSON.stringify({
      category,
      year,
      month,
      direction,
      logic_version: LOGIC_VERSION,
      rankings,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('ranking-monthly error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
