
import { useState, useEffect } from 'react';
import { Payment, PaidMonth } from '@/types';
import { turso, generateId, createTables } from "@/integrations/turso/client";
import { toast } from "@/hooks/use-toast";

// ثابت لعدد الحصص في الشهر الواحد
const LESSONS_PER_MONTH = 8;

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from Turso when hook initializes
  useEffect(() => {
    const initializePayments = async () => {
      try {
        // إنشاء الجداول أولاً إذا لم تكن موجودة
        await createTables();
        
        // ثم تحميل البيانات
        await fetchPayments();
      } catch (error) {
        console.error("Error initializing payments:", error);
        toast({
          title: "خطأ في تهيئة المدفوعات",
          description: "تعذر تهيئة جداول المدفوعات",
          variant: "destructive"
        });
      }
    };

    initializePayments();
  }, []);

  // تحميل المدفوعات من Turso
  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      
      // First, fetch all payments
      const paymentsResult = await turso.execute("SELECT * FROM payments");
      
      // Then fetch all paid months
      const paidMonthsResult = await turso.execute("SELECT * FROM paid_months");
      
      // Map the database data to our app's data structure
      const processedPayments = paymentsResult.rows.map((payment: any) => {
        // Find all paid months for this payment
        const relatedPaidMonths = paidMonthsResult.rows
          .filter((pm: any) => pm.payment_id === payment.id)
          .map((pm: any) => ({
            month: pm.month,
            date: pm.date
          }));
        
        return {
          id: payment.id,
          studentId: payment.student_id,
          studentName: payment.student_name,
          studentCode: payment.student_code,
          group: payment.student_group,
          month: payment.month,
          date: payment.date,
          paidMonths: relatedPaidMonths
        };
      });
      
      setPayments(processedPayments);
      console.log("Loaded payments from Turso:", processedPayments.length);
    } catch (error) {
      console.error("Error loading payments from Turso:", error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  // Add a new payment
  const addPayment = async (
    studentId: string,
    studentName: string,
    studentCode: string,
    group: string,
    month: string
  ) => {
    try {
      const date = new Date().toISOString();
      const paidMonth: PaidMonth = {
        month,
        date
      };

      // Check if payment record for this student already exists
      const existingPayment = payments.find(p => p.studentId === studentId);

      if (existingPayment) {
        // Check if this month is already paid
        const monthAlreadyPaid = existingPayment.paidMonths.some(pm => pm.month === month);
        if (monthAlreadyPaid) {
          return {
            success: false,
            message: `تم دفع شهر ${month} مسبقا للطالب ${studentName}`,
            payment: existingPayment
          };
        }

        // Update existing payment in Turso
        await turso.execute({
          sql: "UPDATE payments SET month = ?, date = ? WHERE id = ?",
          args: [month, date, existingPayment.id]
        });

        // Add new paid month
        await turso.execute({
          sql: "INSERT INTO paid_months (id, payment_id, month, date) VALUES (?, ?, ?, ?)",
          args: [generateId(), existingPayment.id, month, date]
        });

        // Update local state
        const updatedPayments = payments.map(payment => {
          if (payment.id === existingPayment.id) {
            return {
              ...payment,
              month,
              date,
              paidMonths: [...payment.paidMonths, paidMonth]
            };
          }
          return payment;
        });

        setPayments(updatedPayments);

        return {
          success: true,
          message: `تم تسجيل دفع شهر ${month} للطالب ${studentName}`,
          payment: {
            ...existingPayment,
            month,
            date,
            paidMonths: [...existingPayment.paidMonths, paidMonth]
          }
        };
      } else {
        // Create new payment record for student in Turso
        const paymentId = generateId();
        
        await turso.execute({
          sql: `INSERT INTO payments (id, student_id, student_name, student_code, 
                student_group, month, date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [paymentId, studentId, studentName, studentCode, group, month, date]
        });

        // Add initial paid month
        await turso.execute({
          sql: "INSERT INTO paid_months (id, payment_id, month, date) VALUES (?, ?, ?, ?)",
          args: [generateId(), paymentId, month, date]
        });

        // Create new payment object for local state
        const newPayment: Payment = {
          id: paymentId,
          studentId,
          studentName,
          studentCode,
          group,
          month,
          date,
          paidMonths: [paidMonth]
        };

        // Update state
        setPayments(prevPayments => [...prevPayments, newPayment]);

        return {
          success: true,
          message: `تم تسجيل دفع شهر ${month} للطالب ${studentName}`,
          payment: newPayment
        };
      }
    } catch (error: any) {
      console.error("Error in addPayment:", error);
      return {
        success: false,
        message: `حدث خطأ أثناء تسجيل الدفعة: ${error.message || 'خطأ غير معروف'}`,
        payment: null
      };
    }
  };

  // Delete a payment record
  const deletePayment = async (paymentId: string) => {
    try {
      console.log(`Starting deletion process for payment ID: ${paymentId}`);
      
      // First delete related paid_months
      await turso.execute({
        sql: "DELETE FROM paid_months WHERE payment_id = ?",
        args: [paymentId]
      });
      
      console.log("Successfully deleted related paid months, now deleting payment record");
      
      // Then delete the payment itself
      await turso.execute({
        sql: "DELETE FROM payments WHERE id = ?",
        args: [paymentId]
      });

      // After successful deletion from database, update local state immediately
      setPayments(prevPayments => {
        const updatedPayments = prevPayments.filter(payment => payment.id !== paymentId);
        console.log(`Payments before deletion: ${prevPayments.length}, after deletion: ${updatedPayments.length}`);
        return updatedPayments;
      });
      
      console.log("Payment deleted successfully, state updated");
      
      return {
        success: true,
        message: "تم حذف سجل الدفع بنجاح"
      };
    } catch (error: any) {
      console.error("Error in deletePayment:", error);
      return {
        success: false,
        message: `حدث خطأ أثناء حذف سجل الدفع: ${error.message || 'خطأ غير معروف'}`
      };
    }
  };

  // Get all payment records
  const getAllPayments = () => {
    return payments;
  };

  // Get payment records for a specific student
  const getStudentPayments = (studentId: string) => {
    return payments.filter(payment => payment.studentId === studentId);
  };
  
  // Check if a student has paid for current lesson
  const hasStudentPaidForCurrentLesson = (studentId: string, lessonNumber: number) => {
    const studentPayment = payments.find(p => p.studentId === studentId);
    if (!studentPayment) return false;
    
    // كل شهر يتضمن 8 حصص
    // إذا دفع الطالب ولم يصل إلى 8 حصص بعد، فيعتبر دافعًا
    
    // حساب عدد الأشهر المطلوب دفعها بناءً على رقم الحصة
    const requiredMonths = Math.ceil(lessonNumber / LESSONS_PER_MONTH);
    
    // التحقق مما إذا كان لديه عدد كافٍ من الأشهر المدفوعة
    const hasPaidEnough = studentPayment.paidMonths.length >= requiredMonths;
    
    console.log(`Student ${studentId} - Lesson ${lessonNumber} - Required Months ${requiredMonths} - Paid Months ${studentPayment.paidMonths.length} - Has Paid: ${hasPaidEnough}`);
    
    return hasPaidEnough;
  };

  // تحديد الشهر الحالي للطالب بناءً على رقم الحصة
  const getCurrentMonthByLessonNumber = (lessonNumber: number) => {
    return Math.ceil(lessonNumber / LESSONS_PER_MONTH);
  };

  // حساب الحصة الأولى في الشهر الحالي
  const getFirstLessonInCurrentMonth = (lessonNumber: number) => {
    const currentMonth = getCurrentMonthByLessonNumber(lessonNumber);
    return ((currentMonth - 1) * LESSONS_PER_MONTH) + 1;
  };

  // حساب الحصة الأخيرة في الشهر الحالي
  const getLastLessonInCurrentMonth = (lessonNumber: number) => {
    const currentMonth = getCurrentMonthByLessonNumber(lessonNumber);
    return currentMonth * LESSONS_PER_MONTH;
  };

  // Debug function to check hook state
  const debugPaymentsState = () => {
    console.log("Current payments state:", payments);
    return {
      stateCount: payments.length,
      supabaseIntegrated: true,
      lessonsPerMonth: LESSONS_PER_MONTH
    };
  };

  // تحديث البيانات يدوياً
  const refreshPayments = async () => {
    console.log("Manual refresh requested");
    return await fetchPayments();
  };

  return {
    payments,
    isLoading,
    addPayment,
    deletePayment,
    getAllPayments,
    getStudentPayments,
    hasStudentPaidForCurrentLesson,
    getCurrentMonthByLessonNumber,
    getFirstLessonInCurrentMonth,
    getLastLessonInCurrentMonth,
    debugPaymentsState,
    refreshPayments
  };
}
