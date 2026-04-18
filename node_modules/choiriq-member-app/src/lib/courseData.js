export const lessonTechniques = [
  {
    id: 'agility',
    title: 'Agility',
    items: [
      {
        name: 'Runs and Riffs',
        meaning: 'Fast note patterns sung evenly without swallowing vowels.',
        exercise: 'Start at half-speed on "gee-gee-gee" then increase tempo in a metronome ladder.',
        progressSignal: 'Cleaner transitions and fewer smudged notes at higher tempos.'
      },
      {
        name: 'Arpeggios',
        meaning: 'Broken chord patterns that build interval accuracy and stability.',
        exercise: 'Sing 1-3-5-8-5-3-1 on piano reference notes in all section keys.',
        progressSignal: 'Improved jump confidence and fewer pitch drops on upper tones.'
      },
      {
        name: 'Portamento and Staccato',
        meaning: 'Controlled slides and clean detached attacks for stylistic contrast.',
        exercise: 'Alternate one sliding phrase and one clipped phrase on the same melody.',
        progressSignal: 'Intentional phrasing choices instead of accidental scoops.'
      }
    ]
  },
  {
    id: 'resonance',
    title: 'Resonance',
    items: [
      {
        name: 'Chest, Mask, and Head Balance',
        meaning: 'Using resonant placement so tone stays full but free through range changes.',
        exercise: 'Hum on "ng" then open to vowels while keeping the same facial buzz.',
        progressSignal: 'Tone stays connected instead of flipping abruptly between registers.'
      },
      {
        name: 'Passaggio Control',
        meaning: 'Smoothing the transition area where voice tends to strain or crack.',
        exercise: 'Do five-note slides through passaggio at moderate volume with steady breath.',
        progressSignal: 'Less strain and fewer cracks in upper-middle phrases.'
      },
      {
        name: 'Appoggio Support',
        meaning: 'Breath-pressure balance that stabilizes pitch and tone quality.',
        exercise: 'Sustain 8-second tones while maintaining rib expansion and relaxed throat.',
        progressSignal: 'Longer phrases without gasping and steadier tuning.'
      }
    ]
  },
  {
    id: 'theory',
    title: 'Theory and Solfege',
    items: [
      {
        name: 'Movable Do Solfege',
        meaning: 'Pitch language that trains internal hearing and faster learning.',
        exercise: 'Sing scale patterns and skips using do-re-mi syllables before lyrics.',
        progressSignal: 'Quicker note learning and stronger intonation memory.'
      },
      {
        name: 'Interval Ear Training',
        meaning: 'Recognizing distance between notes for harmony reliability.',
        exercise: 'Call-and-response intervals with piano, then identify by ear.',
        progressSignal: 'Section entries lock faster and harmony clashes reduce.'
      },
      {
        name: 'Sight-Singing Rhythm Grids',
        meaning: 'Reading rhythm and melody in real time under rehearsal pressure.',
        exercise: 'Clap rhythm grid first, then add solfege with metronome at 60-90 bpm.',
        progressSignal: 'More accurate first reads and fewer stop-start corrections.'
      }
    ]
  },
  {
    id: 'gospel',
    title: 'Gospel Phrasing',
    items: [
      {
        name: 'Melisma Control',
        meaning: 'Singing many notes on one syllable while keeping diction intelligible.',
        exercise: 'Isolate melisma into 3-note cells, then stitch into full phrase.',
        progressSignal: 'Runs remain expressive without losing rhythmic placement.'
      },
      {
        name: 'Call and Response',
        meaning: 'Dynamic conversational phrasing between leader and choir sections.',
        exercise: 'Echo leader motifs with matched articulation and delayed entrances.',
        progressSignal: 'Tighter ensemble responsiveness and stronger musical dialogue.'
      },
      {
        name: 'Subito Piano and Messa di Voce',
        meaning: 'Sudden dynamic shifts and controlled cresc-decresc on sustained tones.',
        exercise: 'Practice pp to mf swells over 4 beats, then immediate soft release.',
        progressSignal: 'Greater emotional range without pitch wobble.'
      }
    ]
  },
  {
    id: 'language',
    title: 'Diction and Vowels',
    items: [
      {
        name: 'IPA Vowel Shaping',
        meaning: 'Consistent vowel targets that improve blend and text clarity.',
        exercise: 'Sustain [a], [e], [i], [o], [u] on one pitch with section matching.',
        progressSignal: 'Unified tone color and less section spread on held chords.'
      },
      {
        name: 'Consonant Release Timing',
        meaning: 'Aligning consonants together so cutoffs and diction sound clean.',
        exercise: 'Speak rhythm in unison, then sing while releasing final consonants together.',
        progressSignal: 'Sharper diction and cleaner phrase endings.'
      },
      {
        name: 'Blend Placement',
        meaning: 'Balancing personal tone with section color for ensemble cohesion.',
        exercise: 'Sing at 70% volume and match neighbor timbre before increasing intensity.',
        progressSignal: 'Choir sounds unified, not like isolated solo voices.'
      }
    ]
  }
];

export const quizBank = [
  {
    type: 'Scales',
    question: 'What is the relative minor of C major?',
    options: ['A minor', 'E minor', 'D minor', 'G minor'],
    answer: 'A minor'
  },
  {
    type: 'Intervals',
    question: 'From C up to G is what interval?',
    options: ['Perfect 4th', 'Perfect 5th', 'Major 6th', 'Minor 7th'],
    answer: 'Perfect 5th'
  },
  {
    type: 'Solfège',
    question: 'In movable-do major, what syllable is scale degree 3?',
    options: ['Mi', 'Fa', 'Re', 'La'],
    answer: 'Mi'
  },
  {
    type: 'Gospel Terms',
    question: 'Melisma means:',
    options: ['One note on many syllables', 'Many notes on one syllable', 'Whisper singing', 'Rhythmic speech'],
    answer: 'Many notes on one syllable'
  },
  {
    type: 'Dynamics',
    question: 'What does subito piano mean?',
    options: ['Sudden soft', 'Slow and soft', 'Very loud', 'Sustain softly'],
    answer: 'Sudden soft'
  },
  {
    type: 'Sight-reading',
    question: 'A 4/4 bar with quarter, quarter, half note has how many beats?',
    options: ['2', '3', '4', '5'],
    answer: '4'
  },
  {
    type: 'Rhythm',
    question: 'Syncopation emphasizes:',
    options: ['Only downbeats', 'Off-beats', 'Silence only', 'Tempo changes'],
    answer: 'Off-beats'
  },
  {
    type: 'Blend',
    question: 'Best way to improve section blend quickly?',
    options: ['Match vowel shape', 'Sing louder', 'Ignore consonants', 'Stand farther apart'],
    answer: 'Match vowel shape'
  }
];

export const checklistTemplate = [
  '10-min diaphragmatic breathing set',
  'Pitch accuracy drill with piano references',
  'Run the assigned agility exercise',
  'Practice one sight-singing excerpt',
  'Record and review one gospel phrase'
];
