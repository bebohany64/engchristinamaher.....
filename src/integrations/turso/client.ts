
import { createClient } from '@libsql/client';

const TURSO_URL = "libsql://engchristinamaher-bebohany.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDgyNjA3NzIsImlkIjoiMmU3MWI2MTUtODVmOS00MmY1LWFiMTItMGY1YjJjZDAyNWQxIiwicmlkIjoiMTUwODIwODQtN2NlMC00MWFkLWI4YmItMDE1NTQwMzZhMTQ3In0.c9y7UFbJZQPk_6XxrI7O0sRiSHu8j4Ts7G9Im3gtUJB1AAkOCJ5gSKgWaNakIV0pF5WSdxprxbPb6uCoPrYcBQ";

export const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

// وظائف مساعدة لقاعدة البيانات
export const createTables = async () => {
  try {
    // إنشاء جدول الطلاب
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        group_name TEXT,
        grade TEXT NOT NULL,
        password TEXT NOT NULL,
        phone TEXT NOT NULL,
        parent_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الحضور
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        date TEXT,
        time TEXT,
        status TEXT NOT NULL,
        lesson_number INTEGER NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id)
      )
    `);

    // إنشاء جدول الدرجات
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS grades (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        exam_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_score INTEGER NOT NULL,
        date TEXT,
        lesson_number INTEGER NOT NULL,
        group_name TEXT,
        performance_indicator TEXT NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id)
      )
    `);

    // إنشاء جدول الفيديوهات
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        grade TEXT NOT NULL,
        is_youtube BOOLEAN DEFAULT FALSE,
        upload_date TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول الكتب
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        grade TEXT NOT NULL,
        upload_date TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إنشاء جدول المدفوعات
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        student_code TEXT NOT NULL,
        student_group TEXT NOT NULL,
        month TEXT NOT NULL,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
      )
    `);

    // إنشاء جدول الأشهر المدفوعة
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS paid_months (
        id TEXT PRIMARY KEY,
        payment_id TEXT,
        month TEXT NOT NULL,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      )
    `);

    // إنشاء جدول الآباء
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS parents (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        student_code TEXT NOT NULL,
        student_name TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_code) REFERENCES students(code)
      )
    `);

    console.log("تم إنشاء جميع الجداول بنجاح");
  } catch (error) {
    console.error("خطأ في إنشاء الجداول:", error);
    throw error;
  }
};

// وظيفة لحذف جميع بيانات المدفوعات
export const deleteAllPaymentsData = async () => {
  try {
    await turso.execute("DELETE FROM paid_months");
    await turso.execute("DELETE FROM payments");
    return { success: true };
  } catch (error) {
    console.error("خطأ في حذف بيانات المدفوعات:", error);
    return { success: false, error };
  }
};

// وظيفة لتوليد معرف فريد
export const generateId = () => {
  return crypto.randomUUID();
};
