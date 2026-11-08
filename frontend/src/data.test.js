import assert from 'node:assert/strict';
import test from 'node:test';
import { deals, filterDeals, readReviews } from './data.js';

const ids = items => items.map(({ id }) => id);
const storageWith = value => ({ getItem: key => key === 'atlas-deal-reviews' ? value : null });

test('query matches company names without case sensitivity', () => {
  assert.deepEqual(ids(filterDeals(deals, { query: 'nExUs' }, {})), ['nexus']);
});

test('query matches sectors without case sensitivity', () => {
  assert.deepEqual(ids(filterDeals(deals, { query: 'hEaLtHcArE' }, {})), ['aura']);
});

test('query matches deal types without case sensitivity', () => {
  assert.deepEqual(ids(filterDeals(deals, { query: 'm&a acquisition' }, {})), ['nexus']);
});

test('query, sector, stage, and shortlist filters intersect', () => {
  const reviews = {
    nexus: { stage: 'Shortlisted', notes: '' },
    aura: { stage: 'Shortlisted', notes: '' },
  };

  assert.deepEqual(ids(filterDeals(deals, {
    query: 'GROWTH EQUITY',
    sector: 'Europe',
    stage: 'Shortlisted',
    shortlist: true,
  }, reviews)), []);

  assert.deepEqual(ids(filterDeals(deals, {
    query: 'Growth Equity',
    sector: 'Mid-Market FinTech',
    stage: 'Shortlisted',
    shortlist: true,
  }, { meridian: { stage: 'Shortlisted', notes: '' } })), ['meridian']);
});

test('deals without a review default to the Discovered stage', () => {
  assert.deepEqual(ids(filterDeals(deals, { stage: 'Discovered' }, {
    nexus: { stage: 'In review', notes: '' },
    aura: { stage: 'Discovered', notes: '' },
  })), ['aura', 'vanguard', 'meridian', 'helix', 'terra']);
});

test('shortlist filter returns only shortlisted deals', () => {
  assert.deepEqual(ids(filterDeals(deals, { shortlist: true }, {
    nexus: { stage: 'Shortlisted', notes: '' },
    aura: { stage: 'In review', notes: '' },
    terra: { stage: 'Shortlisted', notes: 'Follow up' },
  })), ['nexus', 'terra']);
});

test('malformed stored JSON returns no reviews', () => {
  assert.deepEqual(readReviews(storageWith('{not valid json')), {});
});

test('invalid top-level values and malformed review entries are ignored', () => {
  for (const value of ['null', '[]', '42', '"review"']) {
    assert.deepEqual(readReviews(storageWith(value)), {});
  }

  const stored = JSON.stringify({
    nexus: { stage: 'In review', notes: 'Valid' },
    unknown: { stage: 'Shortlisted', notes: 'Unknown deal' },
    aura: { stage: 'Not a stage', notes: 'Invalid stage' },
    helix: { stage: 'Passed', notes: 7 },
    terra: null,
  });
  assert.deepEqual(readReviews(storageWith(stored)), {
    nexus: { stage: 'In review', notes: 'Valid' },
  });
});

test('valid stored reviews round-trip unchanged', () => {
  const reviews = {
    nexus: { stage: 'Shortlisted', notes: 'Strong recurring revenue.' },
    aura: { stage: 'Passed', notes: '' },
  };
  const serialized = JSON.stringify(reviews);
  const storage = {
    getItem(key) {
      return key === 'atlas-deal-reviews' ? serialized : null;
    },
  };

  assert.deepEqual(readReviews(storage), reviews);
});
