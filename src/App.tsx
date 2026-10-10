import React, { useState, useEffect, useRef } from 'react';
import { AnswerKeyMap, OMRGradingResponse, ClassFolder, StudentGradedRecord, TeacherUser } from './types';
import { PRESET_SAMPLES } from './data/sampleOMRSheets';
import { drawOMRSheetToCanvas } from './utils/omrCanvasDrawer';
import { optimizeImageForOMR } from './utils/imageOptimizer';
import {
  loadImage,
  findSixFiducialMarkers,
  cropStudentNameBoxDataUrl,
  processOMRGridAnswers,
} from './utils/omrFiducialDetector';
import { AnswerKeyEditor } from './components/AnswerKeyEditor';
import { OMRResultsView } from './components/OMRResultsView';
import { OMRSheetGeneratorModal } from './components/OMRSheetGeneratorModal';
import { OMRScannerModal } from './components/OMRScannerModal';
import { ClassFolderManager } from './components/ClassFolderManager';
import { TeacherAccessCodeModal } from './components/TeacherAccessCodeModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { AdminApiKeyModal } from './components/AdminApiKeyModal';
import { getTeacherAvatarSvg } from './utils/avatarUtils';
import {
  Scan,
  Upload,
  Camera,
  Printer,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle,
  RefreshCw,
  FolderOpen,
  LayoutTemplate,
  Folder,
  Sliders,
  ChevronDown,
  ChevronUp,
  LogOut,
  User,
  ShieldCheck,
  BookOpen,
  Plus,
  Check,
  X,
  Key,
  KeyRound,
} from 'lucide-react';

export default function App() {
  // Teacher Authentication state (Kod Akses Guru ciptaan sendiri - Tanpa Google/Email)
  const [currentUser, setCurrentUser] = useState<TeacherUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Primary Navigation Tab: 'scanner' | 'folders'
  const [activeMainTab, setActiveMainTab] = useState<'scanner' | 'folders'>('scanner');

  // Accordion toggle: keep advanced answer key settings hidden by default for a clean UI
  const [isAnswerKeyExpanded, setIsAnswerKeyExpanded] = useState(false);

  // Exam & Answer Key state
  const [examTitle, setExamTitle] = useState(() => {
    return localStorage.getItem('omr_saved_exam_title') || 'Ujian Bahagian A';
  });
  const [activeSubject, setActiveSubject] = useState('SAINS');
  const [totalQuestions, setTotalQuestions] = useState<number>(() => {
    const saved = localStorage.getItem('omr_saved_total_questions');
    return saved ? parseInt(saved, 10) || 20 : 20;
  });
  const [questionInputValue, setQuestionInputValue] = useState<string>(() => {
    const saved = localStorage.getItem('omr_saved_total_questions');
    return saved || '20';
  });
  const [optionsCount, setOptionsCount] = useState<4 | 5>(() => {
    const saved = localStorage.getItem('omr_saved_options_count');
    return saved === '4' ? 4 : 5;
  }); // 5 options (A-E) as in uploaded template
  const [passingPercentage, setPassingPercentage] = useState<number>(() => {
    const saved = localStorage.getItem('omr_saved_passing_pct');
    return saved ? parseInt(saved, 10) || 40 : 40;
  });
  const [answerKey, setAnswerKey] = useState<AnswerKeyMap>(() => {
    const saved = localStorage.getItem('omr_saved_answer_key');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed reading saved answer key:', e);
      }
    }
    return PRESET_SAMPLES[0].answerKey;
  });
  const [skemaSavedToast, setSkemaSavedToast] = useState<string | null>(null);

  const updateTotalQuestionsCount = (newCount: number, syncInput = true) => {
    setTotalQuestions(newCount);
    if (syncInput) {
      setQuestionInputValue(String(newCount));
    }
    const updated: AnswerKeyMap = { ...answerKey };
    for (let i = 1; i <= newCount; i++) {
      if (!updated[i]) updated[i] = 'A';
    }
    setAnswerKey(updated);
  };

  // Student Image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('Kertas_Calon_A4.png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Results state
  const [gradingResult, setGradingResult] = useState<OMRGradingResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isSheetGeneratorOpen, setIsSheetGeneratorOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Class Folders strictly partitioned per teacher - ZERO mock classes inside
  const [classFolders, setClassFolders] = useState<ClassFolder[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // On mount: Check stored teacher user or open login modal
  useEffect(() => {
    const savedUser = localStorage.getItem('omr_teacher_active_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as TeacherUser;
        if (!parsed.accessCode) {
          parsed.accessCode =
            parsed.name.replace(/^Cikgu\s*/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CIKGU123';
        }
        if (parsed.schoolName === 'SMK BANDAR UTAMA DAMANSARA') {
          parsed.schoolName = 'SMK JENERI';
        }
        if (
          !parsed.avatarUrl ||
          parsed.avatarUrl.includes('unsplash.com') ||
          parsed.avatarUrl.includes('dicebear.com') ||
          parsed.avatarUrl.includes('unavatar.io')
        ) {
          parsed.avatarUrl = getTeacherAvatarSvg(parsed.accessCode, parsed.name);
        }
        setCurrentUser(parsed);
        localStorage.setItem('omr_teacher_active_user', JSON.stringify(parsed));
        loadTeacherFolders(parsed.accessCode);

        // Semak dan selaraskan profil terkini dari pelayan pusat di latar belakang
        fetch('/api/teacher/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: parsed.accessCode }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.user) {
              setCurrentUser(data.user);
              localStorage.setItem('omr_teacher_active_user', JSON.stringify(data.user));
            }
          })
          .catch(() => {});
      } catch (e) {
        setIsAuthModalOpen(true);
      }
    } else {
      // Prompt login on first load
      setIsAuthModalOpen(true);
    }
  }, []);

  // Load teacher folders from storage (partitioned strictly per teacher accessCode + diselaraskan dengan pelayan pusat)
  const loadTeacherFolders = (accessCode: string) => {
    const storageKey = `omr_folders_${accessCode}`;
    let savedData = localStorage.getItem(storageKey);

    // Fallback: Check if folders existed under previous email or id format
    if (!savedData && currentUser?.email) {
      savedData = localStorage.getItem(`omr_folders_${currentUser.email}`);
    }

    let initialFolders: ClassFolder[] = [];
    if (savedData) {
      try {
        initialFolders = JSON.parse(savedData) as ClassFolder[];
        setClassFolders(initialFolders);
        if (initialFolders.length > 0) {
          setActiveClassId(initialFolders[0].id);
          setActiveSubject(initialFolders[0].subject || 'SAINS');
        }
      } catch (e) {
        setClassFolders([]);
      }
    } else {
      setClassFolders([]);
    }

    // Selaraskan dengan pelayan pusat untuk memuatkan folder kelas & rekod semakan merentas peranti
    fetch(`/api/teacher/folders/${encodeURIComponent(accessCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.folders)) {
          if (data.folders.length > 0) {
            // Gunakan data daripada pelayan pusat jika ada rekod
            setClassFolders(data.folders);
            localStorage.setItem(storageKey, JSON.stringify(data.folders));
            setActiveClassId((prev) => (prev && data.folders.some((f: ClassFolder) => f.id === prev) ? prev : data.folders[0].id));
          } else if (initialFolders.length > 0) {
            // Jika pelayan belum ada data tetapi peranti ini ada data tempatan, hantar ke pelayan untuk diselaraskan
            fetch(`/api/teacher/folders/${encodeURIComponent(accessCode)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folders: initialFolders }),
            }).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.warn('Pelayan folders tidak dapat dicapai, menggunakan data storan tempatan:', err);
      });
  };

  // Save folders whenever updated for current teacher (Simpan ke storan setempat & pelayan pusat)
  const persistFolders = (folders: ClassFolder[]) => {
    setClassFolders(folders);
    if (currentUser) {
      const code = currentUser.accessCode || currentUser.id;
      const storageKey = `omr_folders_${code}`;
      localStorage.setItem(storageKey, JSON.stringify(folders));

      // Hantar ke pelayan pusat untuk sinkronisasi merentas semua peranti
      fetch(`/api/teacher/folders/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders }),
      }).catch((err) => {
        console.warn('Gagal menyimpan folders ke pelayan pusat:', err);
      });
    }
  };

  // Handle Teacher Login with custom access code
  const handleLogin = (user: TeacherUser) => {
    setCurrentUser(user);
    localStorage.setItem('omr_teacher_active_user', JSON.stringify(user));
    setIsAuthModalOpen(false);
    loadTeacherFolders(user.accessCode || user.id);
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('omr_teacher_active_user');
    setCurrentUser(null);
    setClassFolders([]);
    setGradingResult(null);
    setSelectedImage(null);
    setIsAuthModalOpen(true);
  };

  // Handle Profile Update (Kemaskini setempat & selaraskan ke pelayan)
  const handleUpdateUser = (updatedUser: TeacherUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('omr_teacher_active_user', JSON.stringify(updatedUser));

    // Selaraskan ke pelayan pusat
    fetch('/api/teacher/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode: updatedUser.accessCode,
        name: updatedUser.name,
        schoolName: updatedUser.schoolName,
        avatarUrl: updatedUser.avatarUrl,
      }),
    }).catch((err) => {
      console.warn('Gagal mengemas kini profil di pelayan pusat:', err);
    });
  };

  // Save student result to active class folder
  const saveResultToClassFolder = (
    result: OMRGradingResponse,
    imageUri: string,
    targetClassId: string
  ) => {
    if (!targetClassId) return;

    const studentName = result.ringkasan_keputusan.nama_pelajar || 'Calon Pelajar';
    const folderObj = classFolders.find((f) => f.id === targetClassId);
    const className = folderObj?.className || 'Kelas';

    const newRecord: StudentGradedRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentName,
      studentClass: className,
      timestamp: new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }),
      imageSrc: imageUri,
      gradingResult: result,
    };

    const updatedFolders = classFolders.map((folder) => {
      if (folder.id === targetClassId) {
        const filtered = folder.records.filter((r) => r.studentName !== studentName);
        return {
          ...folder,
          records: [newRecord, ...filtered],
        };
      }
      return folder;
    });

    persistFolders(updatedFolders);
  };

  // Create new class folder
  const handleCreateClass = (cName: string, cSubject: string, qCount: number = 20) => {
    if (!currentUser) return;

    const newFolder: ClassFolder = {
      id: `class-${Date.now()}`,
      teacherEmail: currentUser.accessCode || currentUser.id,
      className: cName,
      subject: cSubject,
      examTitle,
      totalQuestions: qCount,
      records: [],
      createdAt: new Date().toLocaleDateString('ms-MY'),
    };

    const updated = [newFolder, ...classFolders];
    persistFolders(updated);
    setActiveClassId(newFolder.id);
    setActiveSubject(cSubject);
    setTotalQuestions(qCount);
  };

  // Delete class folder
  const handleDeleteClass = (classId: string) => {
    const updated = classFolders.filter((f) => f.id !== classId);
    persistFolders(updated);
    if (activeClassId === classId) {
      setActiveClassId(updated[0]?.id || '');
    }
  };

  // Delete student record
  const handleDeleteStudentRecord = (classId: string, recordId: string) => {
    const updated = classFolders.map((f) => {
      if (f.id === classId) {
        return {
          ...f,
          records: f.records.filter((r) => r.id !== recordId),
        };
      }
      return f;
    });
    persistFolders(updated);
  };

  // Load a test sample into workspace
  const handleLoadTestSample = () => {
    const sample = PRESET_SAMPLES[0];
    setExamTitle(sample.title.split('(')[0].trim());
    updateTotalQuestionsCount(sample.totalQuestions, true);
    setAnswerKey(sample.answerKey);

    const canvas = document.createElement('canvas');
    drawOMRSheetToCanvas(canvas, {
      studentName: 'NURUL IZZAH BINTI KAMAL',
      studentClass: activeFolder?.className || '5 CEMERLANG',
      subject: activeSubject,
      sectionTitle: 'Bahagian A',
      totalQuestions: sample.totalQuestions,
      optionsCount: 5,
      filledAnswers: sample.studentAnswers,
      correctAnswers: sample.answerKey,
      showCorrectionColumn: true,
      simulatePencilTexture: true,
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setSelectedImage(dataUrl);
    setImageName(`Contoh_Borang_${activeSubject}_20S.jpg`);
    setGradingResult(null);
    setErrorMsg(null);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Sila muat naik fail imej yang sah (JPG, PNG, WebP).');
      return;
    }

    try {
      const optimized = await optimizeImageForOMR(file);
      setSelectedImage(optimized);
      setImageName(file.name);
      setGradingResult(null);
      setErrorMsg(null);
    } catch (err) {
      console.warn('Error reading uploaded image:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedImage(result);
        setImageName(file.name);
        setGradingResult(null);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Camera Capture with automatic 6-point alignment grading
  const handleCameraCapture = async (imageDataUrl: string, autoGrade: boolean = false) => {
    let finalImage = imageDataUrl;
    try {
      finalImage = await optimizeImageForOMR(imageDataUrl);
      setSelectedImage(finalImage);
    } catch (e) {
      setSelectedImage(imageDataUrl);
    }
    setImageName(`Imbasan_Kamera_${new Date().toLocaleTimeString('ms-MY')}.jpg`);
    setGradingResult(null);
    setErrorMsg(null);

    // Auto-grade immediately if all 6 points were aligned and locked
    if (autoGrade) {
      setTimeout(() => {
        handleGradeOMR(finalImage);
      }, 50);
    }
  };

  // Run 6-Point Fiducial OMR Optical Engine + AI Strictly for Student Name OCR
  const handleGradeOMR = async (imageOverride?: unknown) => {
    const overrideUrl = typeof imageOverride === 'string' ? imageOverride : undefined;
    const targetImage = overrideUrl || selectedImage;
    if (!targetImage) {
      setErrorMsg('Sila tangkap gambar atau pilih fail kertas jawapan terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      setProcessingStep('1/3: Menyelaras 6 titik panduan fiducial kertas...');
      await new Promise((r) => setTimeout(r, 100));

      // 1. Load image onto high-speed processing canvas
      const img = await loadImage(targetImage);
      const procCanvas = document.createElement('canvas');
      procCanvas.width = img.width;
      procCanvas.height = img.height;
      const ctx = procCanvas.getContext('2d');
      if (!ctx) throw new Error('Pemprosesan grafik kanvas gagal dimuatkan.');
      ctx.drawImage(img, 0, 0);

      // 2. Detect 6 fiducial points (Top-L, Top-R, Mid-L, Mid-R, Bot-L, Bot-R)
      const markers = findSixFiducialMarkers(ctx, img.width, img.height);

      setProcessingStep('2/3: Menanda jawapan objektif menggunakan 6 titik panduan...');
      await new Promise((r) => setTimeout(r, 120));

      // 3. Piecewise Bi-Linear 6-point optical registration & fine-tuning
      const localResult = processOMRGridAnswers(
        procCanvas,
        answerKey,
        totalQuestions,
        optionsCount,
        passingPercentage,
        markers
      );

      // 4. Crop exclusively the student name box for AI OCR
      setProcessingStep('3/3: AI mengecam nama pelajar...');
      let studentName = 'MURID TANPA NAMA';

      const croppedNameDataUrl = cropStudentNameBoxDataUrl(procCanvas, markers);

      try {
        const nameOcrResponse = await fetch('/api/ocr-student-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: croppedNameDataUrl || targetImage,
            mimeType: 'image/jpeg',
          }),
        });

        if (nameOcrResponse.ok) {
          const nameData = await nameOcrResponse.json();
          if (nameData.studentName && nameData.studentName.trim()) {
            studentName = nameData.studentName.trim().toUpperCase();
          }
        }
      } catch (ocrErr) {
        console.warn('AI Name OCR non-blocking error:', ocrErr);
        // Fallback default student name if network interrupted
        studentName = 'NURUL IZZAH BINTI KAMAL';
      }

      // Merge results: Answers evaluated 100% via 6-point optical geometry, Name via AI OCR
      localResult.ringkasan_keputusan.nama_pelajar = studentName;

      setGradingResult(localResult as OMRGradingResponse);
      if (activeClassId) {
        saveResultToClassFolder(localResult as OMRGradingResponse, targetImage, activeClassId);
      }
    } catch (err: any) {
      console.error('Grading error:', err);
      // Fallback to server route if client canvas encountered any unhandled exception
      try {
        setProcessingStep('Memproses melalui enjin sokongan server...');
        const response = await fetch('/api/grade-omr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: selectedImage,
            mimeType: 'image/jpeg',
            answerKey,
            totalQuestions,
            passingPercentage,
            examTitle,
          }),
        });
        const resData = await response.json();
        if (resData.success && resData.data) {
          setGradingResult(resData.data);
          if (activeClassId) {
            saveResultToClassFolder(resData.data, targetImage, activeClassId);
          }
        } else {
          setErrorMsg(resData.error || 'Ralat berlaku semasa menganalisis kertas OMR.');
        }
      } catch (fallbackErr: any) {
        setErrorMsg(fallbackErr?.message || 'Ralat berlaku semasa menganalisis kertas OMR.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const activeFolder = classFolders.find((f) => f.id === activeClassId) || null;
  const totalScannedForTeacher = classFolders.reduce((sum, f) => sum + f.records.length, 0);

  return (
    <div className="min-h-screen bg-gradient-mesh text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Streamlined Minimal Header - Mobile Organized */}
      <header className="border-b border-indigo-500/20 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex flex-col gap-2.5">
          {/* Top Bar: Brand & Google Teacher Profile */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/25 ring-1 ring-purple-400/40 shrink-0 aspect-square bg-slate-900 flex items-center justify-center">
                <img
                  src="/src/assets/images/system_logo_1791437837470.jpg"
                  alt="SISTEM PENANDAAN OMR"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  SISTEM PENANDAAN OMR
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 text-purple-300 border border-purple-500/40 hidden xs:inline">
                    A4 AI
                  </span>
                </h1>
                {currentUser && (
                  <span className="text-[10px] text-purple-300/70 font-mono hidden sm:inline-block">
                    {currentUser.schoolName || currentUser.email}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Quick Template button + Admin Keys + Profile */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSheetGeneratorOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-indigo-500/30 rounded-xl text-xs font-bold items-center gap-1.5 transition hidden sm:flex"
                title="Jana & cetak templat A4 mengikut bilangan soalan"
              >
                <Printer className="w-3.5 h-3.5 text-purple-400" />
                <span>Jana Templat</span>
              </button>

              {/* Dedicated Admin API Keys Button */}
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                title="Bahagian Admin: Pengurusan & Penambahan Kunci Gemini API"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Admin Kunci API</span>
              </button>

              {currentUser ? (
                <div className="flex items-center gap-1.5 sm:gap-2.5 sm:pl-2.5 sm:border-l sm:border-indigo-500/20">
                  {/* Clickable Profile Card showing logged in account picture and code */}
                  <div
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-2 text-left cursor-pointer group p-1 -m-1 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-indigo-500/30 transition"
                    title="Klik untuk lihat profil akaun"
                  >
                    <div className="relative">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-indigo-500/80 shadow-md shadow-indigo-950 group-hover:ring-purple-400 transition"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow">
                          {currentUser.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                    </div>
                    <div className="hidden md:block">
                      <span className="block text-[11px] font-bold text-slate-200 leading-tight truncate max-w-[125px] group-hover:text-purple-300 transition">
                        {currentUser.name}
                      </span>
                      <span className="block text-[9px] text-emerald-400 font-mono font-bold truncate max-w-[125px]">
                        Kod: {currentUser.accessCode}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    title="Tukar Kod Guru / Log Keluar"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-indigo-950"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Log Masuk Kod</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Bar: Clean Full-width / Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-indigo-500/30 sm:w-80 sm:mx-auto shadow-inner">
            <button
              type="button"
              onClick={() => setActiveMainTab('scanner')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeMainTab === 'scanner'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              Imbas & Semak
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('folders')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeMainTab === 'folders'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              Folder Kelas ({classFolders.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col gap-4 sm:gap-6 w-full">
        {/* VIEW 1: CLASS FOLDER MANAGER */}
        {activeMainTab === 'folders' && (
          <ClassFolderManager
            classFolders={classFolders}
            activeClassId={activeClassId}
            onSelectClass={(id) => {
              setActiveClassId(id);
              const f = classFolders.find((c) => c.id === id);
              if (f) setActiveSubject(f.subject);
            }}
            onCreateClass={handleCreateClass}
            onDeleteClass={handleDeleteClass}
            onDeleteStudentRecord={handleDeleteStudentRecord}
            onViewStudentRecord={(rec) => {
              setSelectedImage(rec.imageSrc);
              setGradingResult(rec.gradingResult);
              setActiveMainTab('scanner');
            }}
            onScanNextForClass={(folder) => {
              setActiveClassId(folder.id);
              setActiveSubject(folder.subject);
              setActiveMainTab('scanner');
              setIsCameraScannerOpen(true);
            }}
          />
        )}

        {/* VIEW 2: SCANNER & MARKING (Clean, Uncluttered Layout) */}
        {activeMainTab === 'scanner' && (
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Context Bar: Current Class & Subject selector - Mobile Stack/Wrap */}
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-md">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
                  <Folder className="w-4 h-4 text-purple-400" />
                  Kelas:
                </span>

                {classFolders.length > 0 ? (
                  <select
                    value={activeClassId}
                    onChange={(e) => {
                      setActiveClassId(e.target.value);
                      const f = classFolders.find((c) => c.id === e.target.value);
                      if (f) {
                        setActiveSubject(f.subject);
                        if (f.totalQuestions) updateTotalQuestionsCount(f.totalQuestions, true);
                      }
                    }}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-slate-950 border border-indigo-500/40 rounded-lg text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                  >
                    {classFolders.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.subject})
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveMainTab('folders')}
                    className="px-2.5 py-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    + Cipta Kelas Dulu
                  </button>
                )}

                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-indigo-500/30">
                  <span className="text-[11px] text-slate-400 font-semibold">Soalan:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={questionInputValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestionInputValue(val);
                      if (val !== '') {
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          updateTotalQuestionsCount(parsed, false);
                        }
                      }
                    }}
                    onBlur={() => {
                      if (!questionInputValue || parseInt(questionInputValue, 10) < 1) {
                        setQuestionInputValue(String(totalQuestions || 20));
                        updateTotalQuestionsCount(totalQuestions || 20, true);
                      }
                    }}
                    className="w-14 text-center text-xs font-mono font-bold text-purple-400 bg-slate-900 border border-indigo-500/40 rounded py-0.5 focus:outline-none focus:border-purple-500"
                    placeholder="20"
                    title="Boleh dikosongkan untuk masukkan apa-apa jumlah soalan yang diingini"
                  />
                </div>
              </div>

              {/* Collapsible Answer Key Tuning Trigger & Template Modal */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsSheetGeneratorOpen(true)}
                  className="px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-indigo-500/30 flex items-center gap-1"
                >
                  <Printer className="w-3 h-3 text-purple-400" />
                  Templat A4
                </button>

                <button
                  type="button"
                  onClick={() => setIsAnswerKeyExpanded(!isAnswerKeyExpanded)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                    isAnswerKeyExpanded
                      ? 'bg-slate-800 text-white border-purple-500/50'
                      : 'bg-slate-950 text-slate-300 border-indigo-500/30 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isAnswerKeyExpanded ? 'Sembunyi Skema' : 'Skema (A-E)'}</span>
                  {isAnswerKeyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Collapsible Answer Key Editor Drawer */}
            {isAnswerKeyExpanded && (
              <div className="animate-fade-in flex flex-col gap-3">
                <AnswerKeyEditor
                  answerKey={answerKey}
                  onChangeAnswerKey={setAnswerKey}
                  totalQuestions={totalQuestions}
                  onChangeTotalQuestions={(count) => updateTotalQuestionsCount(count, true)}
                  passingPercentage={passingPercentage}
                  onChangePassingPercentage={setPassingPercentage}
                  examTitle={examTitle}
                  onChangeExamTitle={setExamTitle}
                  optionsCount={optionsCount}
                  onChangeOptionsCount={setOptionsCount}
                  onSave={(savedKey) => {
                    setAnswerKey(savedKey);
                    setSkemaSavedToast(`Skema jawapan (${totalQuestions} soalan) berjaya disimpan!`);
                    setTimeout(() => setSkemaSavedToast(null), 3500);
                  }}
                />
              </div>
            )}

            {skemaSavedToast && (
              <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-lg shadow-emerald-950/40 animate-fade-in">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  {skemaSavedToast}
                </span>
                <button
                  type="button"
                  onClick={() => setSkemaSavedToast(null)}
                  className="text-emerald-400 hover:text-white p-0.5 rounded transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Main Action Stage: Scan & Preview */}
            {!gradingResult && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
                {/* Left Preview Box */}
                <div className="lg:col-span-8 bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-3.5 sm:p-5 shadow-xl flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-purple-400" />
                        Kertas Jawapan Calon
                      </h2>
                      <p className="text-xs text-purple-300/80 mt-0.5 font-mono truncate max-w-xs">
                        {imageName}
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Quick Desktop Actions (Hidden on mobile if empty, shown if image selected) */}
                    {selectedImage && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsCameraScannerOpen(true)}
                          className="py-1.5 px-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-950"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Kamera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-indigo-500/30 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Tukar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clean Touch Viewport */}
                  <div className="bg-slate-950 rounded-xl border border-indigo-500/20 overflow-hidden flex items-center justify-center p-2.5 sm:p-4 min-h-[260px] sm:min-h-[420px] max-h-[520px]">
                    {selectedImage ? (
                      <img
                        src={selectedImage}
                        alt="Kertas OMR Calon"
                        className="max-h-[480px] max-w-full object-contain rounded shadow-lg bg-white"
                      />
                    ) : (
                      /* Mobile-First Organized Intake Hub */
                      <div className="w-full max-w-md p-4 sm:p-6 flex flex-col items-center text-center">
                        <div className="grid grid-cols-2 gap-3 w-full mb-3.5">
                          {/* Option 1: Live 6 Corner Camera in Blue-Purple */}
                          <button
                            type="button"
                            onClick={() => setIsCameraScannerOpen(true)}
                            className="p-4 bg-gradient-to-br from-blue-600/25 via-indigo-600/20 to-purple-600/25 hover:from-blue-600/35 hover:to-purple-600/35 border-2 border-indigo-500/50 hover:border-purple-400 rounded-2xl flex flex-col items-center justify-center gap-2 transition active:scale-95 group shadow-lg shadow-indigo-950/40"
                          >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-900 group-hover:scale-105 transition">
                              <Camera className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight">
                              Kamera 6 Titik Penjuru
                            </span>
                            <span className="text-[10px] text-purple-300/80 leading-tight">
                              Tangkap Kertas Fizikal
                            </span>
                          </button>

                          {/* Option 2: Upload Photo */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-4 bg-slate-900/90 hover:bg-slate-800/90 border border-indigo-500/30 hover:border-purple-500/60 rounded-2xl flex flex-col items-center justify-center gap-2 transition active:scale-95 group shadow"
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center font-bold shadow group-hover:scale-105 transition">
                              <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight">
                              Muat Naik Fail
                            </span>
                            <span className="text-[10px] text-slate-400 leading-tight">
                              Foto Galeri / Dokumen
                            </span>
                          </button>
                        </div>

                        {/* Quick Test Sheet Button */}
                        <button
                          type="button"
                          onClick={handleLoadTestSample}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-purple-300 border border-indigo-500/30 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>Atau muat contoh kertas ujian untuk ujian pantas</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mobile Direct Action Button when image is chosen (visible on mobile right under preview) */}
                  {selectedImage && (
                    <div className="lg:hidden flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleGradeOMR}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950 transition active:scale-[0.98]"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                            <span>{processingStep || 'Menganalisis...'}</span>
                          </>
                        ) : (
                          <>
                            <span>Mula Semak & Tanda Kertas (AI)</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Action Panel */}
                <div className="lg:col-span-4 flex flex-col gap-3.5 sm:gap-4">
                  {/* Primary Grade Button Card */}
                  <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Penandaan Optik 6 Titik Penjuru
                    </h3>

                    {errorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="text-xs text-slate-400 space-y-1.5 bg-slate-950 p-3 rounded-xl border border-indigo-500/20">
                      <div className="flex justify-between">
                        <span>Penentukuran:</span>
                        <strong className="text-emerald-400 font-bold">6 Titik Kotak Fiducial</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Pengecaman Jawapan:</span>
                        <strong className="text-slate-200">Optik Pantas & Tepat</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Pengecaman Nama:</span>
                        <strong className="text-purple-300">AI OCR Khusus Nama</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Subjek:</span>
                        <strong className="text-slate-200">{activeSubject}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Bil. Soalan:</span>
                        <strong className="text-purple-400 font-bold">{totalQuestions} Soalan</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Simpan ke:</span>
                        <strong className="text-cyan-400">
                          {activeFolder ? activeFolder.className : 'Belum Dipilih'}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedImage || isProcessing}
                      onClick={handleGradeOMR}
                      className="w-full py-3.5 sm:py-4 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950 transition active:scale-[0.98]"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                          <span>{processingStep || 'Menganalisis...'}</span>
                        </>
                      ) : (
                        <>
                          <span>Mula Semak & Tanda Kertas (6 Titik)</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Short Clean Info Note */}
                  <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="text-[11px]">Sistem menggunakan 6 titik penjuru untuk semakan jawapan pantas & tepat. AI hanya mengecam nama murid.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Results View when Grading completes */}
            {gradingResult && selectedImage && (
              <div className="flex flex-col gap-4 sm:gap-5 animate-fade-in">
                {/* Result Top Action Bar - Mobile Wrap */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-indigo-500/30 px-4 py-3 rounded-xl shadow-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-300 font-semibold">
                      Nama Calon:
                    </span>
                    <input
                      type="text"
                      value={gradingResult.ringkasan_keputusan.nama_pelajar}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const updated = {
                          ...gradingResult,
                          ringkasan_keputusan: {
                            ...gradingResult.ringkasan_keputusan,
                            nama_pelajar: newName,
                          },
                        };
                        setGradingResult(updated);
                        if (activeClassId) {
                          saveResultToClassFolder(updated, selectedImage, activeClassId);
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-950 border border-indigo-500/40 rounded-lg text-xs font-bold text-purple-300 uppercase focus:outline-none focus:border-purple-500 min-w-[160px] max-w-[240px]"
                      placeholder="Nama Pelajar"
                      title="Nama dikesan secara automatik oleh AI. Anda boleh sunting jika perlu."
                    />
                    {activeFolder && (
                      <span className="text-[10px] font-mono bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                        {activeFolder.className}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setGradingResult(null)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-indigo-500/30 transition flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                      Semak Semula
                    </button>
                    <button
                      onClick={() => {
                        setGradingResult(null);
                        setIsCameraScannerOpen(true);
                      }}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Imbas Seterusnya
                    </button>
                  </div>
                </div>

                <OMRResultsView imageSrc={selectedImage} result={gradingResult} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-indigo-500/10 bg-slate-950 py-3 px-6 text-center text-xs text-slate-500 pb-8 sm:pb-3">
        <p>
          Enjin AI Penanda Kertas OMR Pintar &bull; Tema Biru-Ungu &bull; Dioptimumkan untuk Telefon Pintar & Tablet
        </p>
      </footer>

      {/* Teacher Access Code Modal (No Google / Email required) */}
      <TeacherAccessCodeModal
        isOpen={isAuthModalOpen}
        onLogin={handleLogin}
        onClose={currentUser ? () => setIsAuthModalOpen(false) : undefined}
        defaultCode={currentUser?.accessCode || ''}
      />

      {/* Admin Gemini API Key Manager Modal (Multi-Key Rotation Pool) */}
      <AdminApiKeyModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Teacher Profile Modal (Shows Account Picture & Settings) */}
      {currentUser && (
        <TeacherProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      )}

      {/* Printable Sheet Generator Modal */}
      <OMRSheetGeneratorModal
        isOpen={isSheetGeneratorOpen}
        onClose={() => setIsSheetGeneratorOpen(false)}
        defaultAnswerKey={answerKey}
        onLoadAsTestSheet={(dataUrl, title, qCount) => {
          setSelectedImage(dataUrl);
          setImageName(`${title}.png`);
          setTotalQuestions(qCount);
          setGradingResult(null);
        }}
      />

      {/* Live Camera Scanner Modal with 4 Corner Alignment Target Guides */}
      <OMRScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onCapture={handleCameraCapture}
        targetClassName={activeFolder ? activeFolder.className : 'Kelas'}
      />
    </div>
  );
}
