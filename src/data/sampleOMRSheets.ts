import { AnswerKeyMap, AnswerOption, PresetOMRSample } from '../types';

// Preset 1: Exactly matching user template (20 Soalan, 5 Pilihan A-E, Sains)
const sample1Key: AnswerKeyMap = {
  1: 'A', 2: 'C', 3: 'B', 4: 'D', 5: 'E',
  6: 'B', 7: 'C', 8: 'A', 9: 'D', 10: 'E',
  11: 'C', 12: 'A', 13: 'D', 14: 'B', 15: 'E',
  16: 'A', 17: 'D', 18: 'B', 19: 'C', 20: 'E'
};

const sample1Answers: Record<number, AnswerOption> = {
  ...sample1Key,
  // Mistakes to demonstrate the side correction column
  3: 'E', // should be B -> shows ✘ Betul: B
  7: 'A', // should be C -> shows ✘ Betul: C
  12: 'TIADA_JAWAPAN', // blank -> shows ○ Kosong (Betul: A)
  18: 'D' // should be B -> shows ✘ Betul: B
};

// Preset 2: 40 Soalan (A-E, Peperiksaan Percubaan SPM)
const sample2Key: AnswerKeyMap = {
  ...sample1Key,
  21: 'B', 22: 'D', 23: 'C', 24: 'A', 25: 'E',
  26: 'C', 27: 'D', 28: 'A', 29: 'B', 30: 'E',
  31: 'D', 32: 'A', 33: 'B', 34: 'C', 35: 'E',
  36: 'A', 37: 'B', 38: 'C', 39: 'D', 40: 'E'
};

const sample2Answers: Record<number, AnswerOption> = {
  ...sample2Key,
  4: 'B',
  12: 'C',
  19: 'TIADA_JAWAPAN',
  27: 'B',
  35: 'AMBIGU/DOUBLE_MARK'
};

// Preset 3: 10 Soalan Pantas
const sample3Key: AnswerKeyMap = {
  1: 'B', 2: 'D', 3: 'A', 4: 'C', 5: 'E',
  6: 'A', 7: 'D', 8: 'C', 9: 'E', 10: 'B'
};

const sample3Answers: Record<number, AnswerOption> = {
  ...sample3Key,
  2: 'B', // should be D
  8: 'A' // should be C
};

export const PRESET_SAMPLES: PresetOMRSample[] = [
  {
    id: 'sains-20-ae',
    title: 'Lembaran OMR A4 Sains Bahagian A (20 Soalan, Pilihan A-E)',
    subject: 'SAINS',
    studentName: 'NURUL IZZAH BINTI KAMAL',
    totalQuestions: 20,
    scoreDescription: '16/20 (80%) - Terdapat soalan salah & ruang pembetulan di sebelah',
    imageUrl: '',
    answerKey: sample1Key,
    studentAnswers: sample1Answers,
  },
  {
    id: 'sains-40-ae',
    title: 'Lembaran OMR A4 Sains SPM (40 Soalan, Pilihan A-E)',
    subject: 'SAINS',
    studentName: 'AHMAD DANIAL BIN RAZAK',
    totalQuestions: 40,
    scoreDescription: '35/40 (87.5%) - Format 40 Soalan Satu Halaman A4',
    imageUrl: '',
    answerKey: sample2Key,
    studentAnswers: sample2Answers,
  },
  {
    id: 'kuiz-10-ae',
    title: 'Kuiz Pantas Bahagian A (10 Soalan, Pilihan A-E)',
    subject: 'MATEMATIK',
    studentName: 'MUHAMMAD HARITH BIN FAUZI',
    totalQuestions: 10,
    scoreDescription: '8/10 (80%) - Kuiz Pantas 10 Soalan A4',
    imageUrl: '',
    answerKey: sample3Key,
    studentAnswers: sample3Answers,
  },
];
