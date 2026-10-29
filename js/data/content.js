/*
 * content.js — Language-neutral structure of the site content.
 * All user-visible text lives in translations/ar.json and translations/en.json;
 * this file only holds ids, ordering, categories, documentation status, source ids,
 * map coordinates and — for the game — the index of the correct answer, so the
 * correct answers are guaranteed to be identical in both languages.
 */
(function (global) {
  'use strict';

  var SOURCES = {
    wiki: 'https://en.wikipedia.org/wiki/Ajloun_Castle',
    creighton: 'https://moses.creighton.edu/vr/Ajlun/txt/intro.html',
    roughguides: 'https://www.roughguides.com/jordan/jerash-north/ajloun-castle',
    visitjordan: 'https://international.visitjordan.com/wheretogo/ajloun/'
  };

  // Map coordinates are on a fixed north-up plan (viewBox 0 0 400 300); the plan
  // is geographic, so it is intentionally NOT mirrored in RTL.
  var TOUR = [
    { id: 'approach', status: 'verified', sources: ['wiki', 'roughguides'], x: 62, y: 262 },
    { id: 'moat', status: 'varies', sources: ['wiki', 'creighton'], x: 82, y: 150 },
    { id: 'gate', status: 'verified', sources: ['roughguides', 'creighton'], x: 318, y: 132 },
    { id: 'core', status: 'varies', sources: ['wiki', 'creighton', 'visitjordan'], x: 196, y: 138 },
    { id: 'aybak', status: 'varies', sources: ['creighton', 'wiki'], x: 270, y: 212 },
    { id: 'halls', status: 'verified', sources: ['roughguides', 'wiki'], x: 160, y: 182 },
    { id: 'signals', status: 'needsVerification', sources: ['roughguides'], x: 136, y: 92 },
    { id: 'later', status: 'verified', sources: ['wiki', 'roughguides', 'creighton'], x: 236, y: 92 }
  ];

  var LIBRARY_CATEGORIES = ['all', 'history', 'architecture', 'people', 'documents', 'digital'];

  var LIBRARY = [
    { id: 'name', category: 'history', status: 'tradition', sources: ['wiki'] },
    { id: 'usama', category: 'people', status: 'varies', sources: ['wiki', 'creighton', 'roughguides'] },
    { id: 'aybak', category: 'people', status: 'varies', sources: ['creighton', 'wiki'] },
    { id: 'moat', category: 'architecture', status: 'varies', sources: ['wiki', 'creighton'] },
    { id: 'towers', category: 'architecture', status: 'verified', sources: ['wiki', 'creighton', 'roughguides'] },
    { id: 'monastery', category: 'history', status: 'verified', sources: ['wiki', 'roughguides'] },
    { id: 'ironMines', category: 'history', status: 'verified', sources: ['wiki', 'roughguides'] },
    { id: 'mongols', category: 'history', status: 'verified', sources: ['wiki', 'roughguides'] },
    { id: 'burckhardt', category: 'documents', status: 'verified', sources: ['wiki', 'roughguides'] },
    { id: 'earthquakes', category: 'history', status: 'verified', sources: ['wiki', 'roughguides', 'creighton'] },
    { id: 'inscription', category: 'documents', status: 'needsVerification', sources: ['wiki'] },
    { id: 'digitalArchive', category: 'digital', status: 'practice', sources: [], tool: 'hash' }
  ];

  var AWARENESS_TOPICS = ['phishing', 'passwords', 'mfa', 'updates', 'backup', 'social', 'integrity', 'heritage'];

  // correct = zero-based index into the options array (same order in ar.json and en.json)
  var GAME = {
    pointsPerCorrect: 10,
    startShields: 3,
    stages: ['gate', 'walls', 'tower'],
    questions: [
      { id: 'q1', stage: 'gate', correct: 2 },
      { id: 'q2', stage: 'gate', correct: 0 },
      { id: 'q3', stage: 'gate', correct: 1 },
      { id: 'q4', stage: 'gate', correct: 3 },
      { id: 'q5', stage: 'walls', correct: 2 },
      { id: 'q6', stage: 'walls', correct: 1 },
      { id: 'q7', stage: 'walls', correct: 3, ltrOptions: true },
      { id: 'q8', stage: 'walls', correct: 0 },
      { id: 'q9', stage: 'tower', correct: 1 },
      { id: 'q10', stage: 'tower', correct: 2 },
      { id: 'q11', stage: 'tower', correct: 0 },
      { id: 'q12', stage: 'tower', correct: 3 }
    ]
  };

  global.RabadhContent = {
    SOURCES: SOURCES,
    TOUR: TOUR,
    LIBRARY: LIBRARY,
    LIBRARY_CATEGORIES: LIBRARY_CATEGORIES,
    AWARENESS_TOPICS: AWARENESS_TOPICS,
    GAME: GAME
  };
})(window);
