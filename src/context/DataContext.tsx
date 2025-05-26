import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { turso, generateId } from "@/integrations/turso/client";
import { toast } from "@/hooks/use-toast";
import {
  Grade,
  Video,
  Book,
  Attendance,
} from "@/types";

export interface DataContextType {
  grades: Grade[];
  videos: Video[];
  books: Book[];
  attendance: Attendance[];
  fetchGrades: () => Promise<void>;
  fetchVideos: () => Promise<void>;
  fetchBooks: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  getStudentGrades: (studentId: string) => Grade[];
  getVideosByGrade: (grade: "first" | "second" | "third") => Video[];
  getAllVideos: () => Video[];
  getStudentAttendance: (studentId: string) => Attendance[];
  getStudentLessonCount: (studentId: string) => number;
  deleteAttendanceRecord: (recordId: string) => Promise<void>;
  deleteGrade: (gradeId: string) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  addGrade: (
    studentId: string,
    studentName: string,
    examName: string,
    score: number,
    totalScore?: number,
    lessonNumber?: number,
    group?: string
  ) => Promise<Grade | null>;
  updateGrade: (
    gradeId: string,
    examName: string,
    score: number,
    totalScore: number,
    lessonNumber?: number,
    group?: string
  ) => Promise<boolean>;
  addVideo: (
    title: string,
    url: string,
    grade: "first" | "second" | "third",
    isYouTube?: boolean
  ) => Promise<Video | null>;
  updateVideo: (
    videoId: string,
    title: string,
    url: string,
    grade: "first" | "second" | "third",
    isYouTube?: boolean
  ) => Promise<boolean>;
  addAttendance: (
    studentId: string,
    studentName: string,
    status?: "present" | "absent",
    lessonNumber?: number
  ) => Promise<Attendance | null>;
  addBook: (
    title: string,
    url: string,
    grade: "first" | "second" | "third"
  ) => Promise<Book | null>;
  updateBook: (
    bookId: string,
    title: string,
    url: string,
    grade: "first" | "second" | "third"
  ) => Promise<boolean>;
  deleteBook: (bookId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function calculatePerformanceIndicator(score: number, totalScore: number): "excellent" | "very-good" | "good" | "fair" | "needs-improvement" {
  const percentage = (score / totalScore) * 100;

  if (percentage >= 90) {
    return "excellent";
  } else if (percentage >= 80) {
    return "very-good";
  } else if (percentage >= 70) {
    return "good";
  } else if (percentage >= 60) {
    return "fair";
  } else {
    return "needs-improvement";
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    // Load all data from Turso on initial mount
    fetchGrades();
    fetchVideos();
    fetchBooks();
    fetchAttendance();
  }, []);

  const getStudentGrades = useCallback(
    (studentId: string): Grade[] => {
      return grades.filter((grade) => grade.studentId === studentId);
    },
    [grades]
  );

  const getVideosByGrade = useCallback(
    (grade: "first" | "second" | "third"): Video[] => {
      return videos.filter((video) => video.grade === grade);
    },
    [videos]
  );
  
  const getAllVideos = useCallback(
    (): Video[] => {
      return videos;
    },
    [videos]
  );

  const getStudentAttendance = useCallback(
    (studentId: string): Attendance[] => {
      return attendance.filter((record) => record.studentId === studentId);
    },
    [attendance]
  );

  const getStudentLessonCount = useCallback(
    (studentId: string): number => {
      return attendance.filter((record) => record.studentId === studentId).length;
    },
    [attendance]
  );

  const deleteAttendanceRecord = async (recordId: string) => {
    try {
      await turso.execute({
        sql: "DELETE FROM attendance WHERE id = ?",
        args: [recordId]
      });

      setAttendance((prevAttendance) =>
        prevAttendance.filter((record) => record.id !== recordId)
      );

      toast({
        title: "✅ تم حذف سجل الحضور بنجاح",
        description: "تم حذف سجل الحضور من النظام"
      });
    } catch (error: any) {
      console.error("Error deleting attendance record:", error);
      toast({
        title: "❌ خطأ في حذف سجل الحضور",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  };

  const deleteGrade = async (gradeId: string) => {
    try {
      await turso.execute({
        sql: "DELETE FROM grades WHERE id = ?",
        args: [gradeId]
      });

      setGrades((prevGrades) => prevGrades.filter((grade) => grade.id !== gradeId));

      toast({
        title: "✅ تم حذف الدرجة بنجاح",
        description: "تم حذف الدرجة من النظام"
      });
    } catch (error: any) {
      console.error("Error deleting grade:", error);
      toast({
        title: "❌ خطأ في حذف الدرجة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  };

  const deleteVideo = async (videoId: string) => {
    try {
      await turso.execute({
        sql: "DELETE FROM videos WHERE id = ?",
        args: [videoId]
      });

      setVideos((prevVideos) => prevVideos.filter((video) => video.id !== videoId));

      toast({
        title: "✅ تم حذف الفيديو بنجاح",
        description: "تم حذف الفيديو من النظام"
      });
    } catch (error: any) {
      console.error("Error deleting video:", error);
      toast({
        title: "❌ خطأ في حذف الفيديو",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  };

  // Fetch grades from Turso
  const fetchGrades = async () => {
    try {
      const result = await turso.execute("SELECT * FROM grades");
      const formattedGrades = result.rows.map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        examName: row.exam_name,
        score: Number(row.score),
        totalScore: Number(row.total_score),
        date: row.date,
        lessonNumber: row.lesson_number || 1,
        group: row.group_name || "",
        performanceIndicator: row.performance_indicator || "good",
      }));
      setGrades(formattedGrades);
    } catch (error) {
      console.error('Error fetching grades from Turso:', error);
      toast({
        title: "خطأ في تحميل الدرجات",
        description: "تعذر تحميل الدرجات من قاعدة البيانات",
        variant: "destructive"
      });
    }
  };

  // Fetch attendance from Turso
  const fetchAttendance = async () => {
    try {
      const result = await turso.execute("SELECT * FROM attendance");
      const formattedAttendance = result.rows.map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        date: row.date,
        time: row.time || "",
        status: row.status,
        lessonNumber: row.lesson_number || 1,
      }));
      setAttendance(formattedAttendance);
    } catch (error) {
      console.error('Error fetching attendance from Turso:', error);
      toast({
        title: "خطأ في تحميل الحضور",
        description: "تعذر تحميل بيانات الحضور من قاعدة البيانات",
        variant: "destructive"
      });
    }
  };

  // Fetch videos from Turso
  const fetchVideos = async () => {
    try {
      const result = await turso.execute("SELECT * FROM videos");
      const formattedVideos = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        uploadDate: row.upload_date,
        grade: row.grade,
        isYouTube: row.is_youtube || false,
      }));
      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error fetching videos from Turso:', error);
      toast({
        title: "خطأ في تحميل الفيديوهات",
        description: "تعذر تحميل الفيديوهات من قاعدة البيانات",
        variant: "destructive"
      });
    }
  };

  // Fetch books from Turso
  const fetchBooks = async () => {
    try {
      const result = await turso.execute("SELECT * FROM books");
      const formattedBooks = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        url: row.url,
        uploadDate: row.upload_date,
        grade: row.grade,
      }));
      setBooks(formattedBooks);
    } catch (error) {
      console.error('Error fetching books from Turso:', error);
      toast({
        title: "خطأ في تحميل الكتب",
        description: "تعذر تحميل الكتب من قاعدة البيانات",
        variant: "destructive"
      });
    }
  };

  // Add grade function
  const addGrade = async (
    studentId: string,
    studentName: string,
    examName: string,
    score: number,
    totalScore: number = 100,
    lessonNumber: number = 1,
    group: string = ""
  ) => {
    try {
      const id = generateId();
      const date = new Date().toISOString();
      const performanceIndicator = calculatePerformanceIndicator(score, totalScore);

      await turso.execute({
        sql: `INSERT INTO grades (id, student_id, student_name, exam_name, score, total_score, 
              lesson_number, group_name, performance_indicator, date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, studentId, studentName, examName, score, totalScore, lessonNumber, group, performanceIndicator, date]
      });

      const newGrade: Grade = {
        id,
        studentId,
        studentName,
        examName,
        score,
        totalScore,
        lessonNumber,
        group,
        performanceIndicator,
        date
      };

      setGrades(prevGrades => [...prevGrades, newGrade]);
      
      toast({
        title: "✅ تم إضافة الدرجة بنجاح",
        description: `تم إضافة درجة ${examName} للطالب ${studentName}`
      });
      
      return newGrade;
    } catch (error: any) {
      console.error('Error adding grade:', error);
      toast({
        title: "❌ خطأ في إضافة الدرجة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return null;
    }
  };

  // Update grade function
  const updateGrade = async (
    gradeId: string,
    examName: string,
    score: number,
    totalScore: number,
    lessonNumber: number = 1,
    group: string = ""
  ) => {
    try {
      const performanceIndicator = calculatePerformanceIndicator(score, totalScore);
      
      await turso.execute({
        sql: `
          UPDATE grades 
          SET exam_name = ?, score = ?, total_score = ?, lesson_number = ?, group_name = ?, performance_indicator = ?
          WHERE id = ?
        `,
        args: [examName, score, totalScore, lessonNumber, group, performanceIndicator, gradeId]
      });
      
      setGrades(prevGrades => prevGrades.map(grade => 
        grade.id === gradeId ? {
          ...grade,
          examName,
          score,
          totalScore,
          lessonNumber,
          group,
          performanceIndicator
        } : grade
      ));
      
      toast({
        title: "✅ تم تحديث الدرجة بنجاح",
        description: `تم تحديث درجة ${examName}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Error updating grade:', error);
      toast({
        title: "❌ خطأ في تحديث الدرجة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return false;
    }
  };

  // Add video function
  const addVideo = async (title: string, url: string, grade: "first" | "second" | "third", isYouTube: boolean = false) => {
    try {
      const id = generateId();
      const uploadDate = new Date().toISOString();

      await turso.execute({
        sql: `
          INSERT INTO videos (id, title, url, grade, is_youtube, upload_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [id, title, url, grade, isYouTube, uploadDate]
      });

      const newVideo: Video = {
        id,
        title,
        url,
        grade,
        isYouTube,
        uploadDate
      };
      
      setVideos(prevVideos => [...prevVideos, newVideo]);
      
      toast({
        title: "✅ تم إضافة الفيديو بنجاح",
        description: `تم إضافة الفيديو: ${title}`
      });
      
      return newVideo;
    } catch (error: any) {
      console.error('Error adding video:', error);
      toast({
        title: "❌ خطأ في إضافة الفيديو",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return null;
    }
  };

  // Update video function
  const updateVideo = async (
    videoId: string, 
    title: string, 
    url: string, 
    grade: "first" | "second" | "third", 
    isYouTube: boolean = false
  ) => {
    try {
      await turso.execute({
        sql: `
          UPDATE videos
          SET title = ?, url = ?, grade = ?, is_youtube = ?
          WHERE id = ?
        `,
        args: [title, url, grade, isYouTube, videoId]
      });
      
      setVideos(prevVideos => prevVideos.map(video => 
        video.id === videoId ? {
          ...video,
          title,
          url,
          grade,
          isYouTube
        } : video
      ));
      
      toast({
        title: "✅ تم تحديث الفيديو بنجاح",
        description: `تم تحديث الفيديو: ${title}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Error updating video:', error);
      toast({
        title: "❌ خطأ في تحديث الفيديو",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return false;
    }
  };

  // Add attendance function
  const addAttendance = async (
    studentId: string,
    studentName: string,
    status: "present" | "absent" = "present",
    lessonNumber: number = 1
  ) => {
    try {
      const id = generateId();
      const currentTime = new Date();
      const time = currentTime.toLocaleTimeString();
      const date = currentTime.toISOString();

      await turso.execute({
        sql: `
          INSERT INTO attendance (id, student_id, student_name, status, lesson_number, time, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [id, studentId, studentName, status, lessonNumber, time, date]
      });

      const newAttendance: Attendance = {
        id,
        studentId,
        studentName,
        status,
        lessonNumber,
        time,
        date
      };
      
      setAttendance(prevAttendance => [...prevAttendance, newAttendance]);
      
      return newAttendance;
    } catch (error: any) {
      console.error('Error adding attendance:', error);
      toast({
        title: "❌ خطأ في تسجيل الحضور",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return null;
    }
  };

  // Add book function
  const addBook = async (
    title: string,
    url: string,
    grade: "first" | "second" | "third"
  ) => {
    try {
      const id = generateId();
      const uploadDate = new Date().toISOString();

      await turso.execute({
        sql: `INSERT INTO books (id, title, url, grade, upload_date) VALUES (?, ?, ?, ?, ?)`,
        args: [id, title, url, grade, uploadDate]
      });

      const newBook: Book = {
        id,
        title,
        url,
        grade,
        uploadDate
      };
      
      setBooks(prevBooks => [...prevBooks, newBook]);
      
      toast({
        title: "✅ تم إضافة الكتاب بنجاح",
        description: `تم إضافة الكتاب: ${title}`
      });
      
      return newBook;
    } catch (error: any) {
      console.error('Error adding book:', error);
      toast({
        title: "❌ خطأ في إضافة الكتاب",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return null;
    }
  };

  // Update book function
  const updateBook = async (
    bookId: string, 
    title: string, 
    url: string, 
    grade: "first" | "second" | "third"
  ) => {
    try {
      await turso.execute({
        sql: `UPDATE books SET title = ?, url = ?, grade = ? WHERE id = ?`,
        args: [title, url, grade, bookId]
      });
      
      setBooks(prevBooks => prevBooks.map(book => 
        book.id === bookId ? {
          ...book,
          title,
          url,
          grade
        } : book
      ));
      
      toast({
        title: "✅ تم تحديث الكتاب بنجاح",
        description: `تم تحديث الكتاب: ${title}`
      });
      
      return true;
    } catch (error: any) {
      console.error('Error updating book:', error);
      toast({
        title: "❌ خطأ في تحديث الكتاب",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      return false;
    }
  };

  // Delete book function
  const deleteBook = async (bookId: string) => {
    try {
      await turso.execute({
        sql: "DELETE FROM books WHERE id = ?",
        args: [bookId]
      });

      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));

      toast({
        title: "✅ تم حذف الكتاب بنجاح",
        description: "تم حذف الكتاب من النظام"
      });
    } catch (error: any) {
      console.error("Error deleting book:", error);
      toast({
        title: "❌ خطأ في حذف الكتاب",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  };

  return (
    <DataContext.Provider value={{
      grades,
      videos,
      books,
      attendance,
      fetchGrades,
      fetchVideos,
      fetchBooks,
      fetchAttendance,
      getStudentGrades,
      getVideosByGrade,
      getAllVideos,
      getStudentAttendance,
      getStudentLessonCount,
      deleteAttendanceRecord,
      deleteGrade,
      deleteVideo,
      addGrade,
      updateGrade,
      addVideo,
      updateVideo,
      addAttendance,
      addBook,
      updateBook,
      deleteBook,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
