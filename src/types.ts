export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E' | 'TIADA_JAWAPAN' | 'AMBIGU/DOUBLE_MARK';

export interface AnswerKeyMap {
  [questionNumber: number]: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface QuestionAnnotation {
  simbol: '✔' | '✘' | '⚠' | '○';
  warna: 'GREEN' | 'RED' | 'YELLOW' | 'ORANGE';
  teks_tambahan: string;
}

export interface QuestionBoundingBox {
  // Normalized 0 to 1000 or percentage 0 to 100
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  // Specific option coordinates if detected
  markedBubble?: { x: number; y: number };
  correctBubble?: { x: number; y: number };
}

export interface QuestionAnalysis {
  nombor_soalan: number;
  jawapan_pelajar: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'TIADA_JAWAPAN' | 'AMBIGU/DOUBLE_MARK'
  jawapan_sebenar: 'A' | 'B' | 'C' | 'D' | 'E';
  status: 'BETUL' | 'SALAH' | 'KOSONG' | 'DOUBLE_MARK';
  annotation: QuestionAnnotation;
  box?: QuestionBoundingBox;
}

export interface RingkasanKeputusan {
  nama_pelajar: string;
  nombor_kad_pengenalan?: string;
  angka_giliran?: string;
  jumlah_soalan: number;
  jawapan_betul: number;
  jawapan_salah: number;
  jawapan_kosong?: number;
  jawapan_ambigu?: number;
  jumlah_markah: string; // e.g. "35/40"
  peratusan: string; // e.g. "87.5%"
  gred?: string; // e.g. "A+", "A", "B+", "C", "F"
}

export interface CetakanHeaderMarkah {
  posisi: 'BOTTOM_FOOTER' | 'TOP_RIGHT' | 'TOP_CENTER' | 'TOP_LEFT';
  teks_cetakan: string; // e.g. "MARKAH: 35/40 | 87.5%"
  status_kelulusan: 'LULUS' | 'GAGAL' | 'CEMERLANG';
  tarikh?: string;
}

export interface OMRGradingResponse {
  ringkasan_keputusan: RingkasanKeputusan;
  analisis_detail: QuestionAnalysis[];
  cetakan_header_markah: CetakanHeaderMarkah;
  catatan_teknikal?: string;
}

export interface PresetOMRSample {
  id: string;
  title: string;
  subject: string;
  studentName: string;
  totalQuestions: number;
  scoreDescription: string;
  imageUrl: string;
  answerKey: AnswerKeyMap;
  studentAnswers: Record<number, AnswerOption>;
}

export interface StudentGradedRecord {
  id: string;
  studentName: string;
  studentClass: string;
  timestamp: string;
  imageSrc: string; // original paper image data URL
  gradingResult: OMRGradingResponse;
}

export interface ClassFolder {
  id: string;
  teacherEmail: string;
  className: string;
  subject: string;
  examTitle: string;
  totalQuestions?: number;
  answerKey?: AnswerKeyMap;
  records: StudentGradedRecord[];
  createdAt: string;
}

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  schoolName?: string;
}


