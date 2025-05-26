import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Student, Parent } from "@/types";
import { generateRandomCode, generateUniquePassword } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { turso, generateId, createTables } from "@/integrations/turso/client";

interface AuthContextType {
  currentUser: User | null;
  students: Student[];
  parents: Parent[];
  login: (phoneNumber: string, password: string) => Promise<boolean>;
  logout: () => void;
  createStudent: (
    name: string,
    phone: string,
    parentPhone: string,
    group: string,
    grade: "first" | "second" | "third"
  ) => Promise<Student>;
  updateStudent: (
    id: string,
    name: string,
    phone: string,
    password: string,
    parentPhone: string,
    group: string,
    grade: "first" | "second" | "third"
  ) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  createParent: (phone: string, studentCode: string) => Promise<Parent>;
  updateParent: (id: string, phone: string, studentCode: string, password: string) => Promise<void>;
  deleteParent: (id: string) => Promise<void>;
  getStudentByCode: (code: string) => Promise<Student | undefined>;
  getAllStudents: () => Student[];
  getAllParents: () => Parent[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial admin user with updated credentials
const adminUser: User = {
  id: "admin-1",
  name: "admin",
  phone: "AdminAPPEng.Christina Maher",
  password: "Eng.Christina Maher0022",
  role: "admin"
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from Turso on initial mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // إنشاء الجداول أولاً إذا لم تكن موجودة
        await createTables();
        
        // Load user from localStorage only for session persistence
        const storedUser = localStorage.getItem("currentUser");
        const userLoggedIn = localStorage.getItem("userLoggedIn");
        
        if (storedUser && userLoggedIn === "true") {
          try {
            setCurrentUser(JSON.parse(storedUser));
          } catch (error) {
            console.error("Failed to parse user from localStorage:", error);
            localStorage.removeItem("currentUser");
            localStorage.removeItem("userLoggedIn");
          }
        }
        
        // Always fetch students from Turso as primary source
        try {
          const studentsResult = await turso.execute("SELECT * FROM students");
          
          if (studentsResult.rows) {
            const formattedStudents: Student[] = studentsResult.rows.map((student: any) => ({
              id: student.id,
              name: student.name,
              phone: student.phone,
              password: student.password,
              code: student.code,
              parentPhone: student.parent_phone,
              group: student.group_name,
              grade: student.grade as "first" | "second" | "third",
              role: "student"
            }));
            setStudents(formattedStudents);
            console.log("تم تحميل الطلاب من Turso:", formattedStudents.length);
          }
        } catch (error) {
          console.error("Error fetching students from Turso:", error);
          toast({
            title: "خطأ في تحميل بيانات الطلاب",
            description: "تعذر تحميل بيانات الطلاب من قاعدة البيانات",
            variant: "destructive"
          });
        }
        
        // Always fetch parents from Turso as primary source
        try {
          const parentsResult = await turso.execute("SELECT * FROM parents");
          
          if (parentsResult.rows) {
            const formattedParents: Parent[] = parentsResult.rows.map((parent: any) => ({
              id: parent.id,
              phone: parent.phone,
              studentCode: parent.student_code,
              studentName: parent.student_name,
              password: parent.password
            }));
            setParents(formattedParents);
            console.log("تم تحميل أولياء الأمور من Turso:", formattedParents.length);
          }
        } catch (error) {
          console.error("Error fetching parents from Turso:", error);
          toast({
            title: "خطأ في تحميل بيانات أولياء الأمور",
            description: "تعذر تحميل بيانات أولياء الأمور من قاعدة البيانات",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading data from Turso:", error);
        toast({
          title: "خطأ في الاتصال",
          description: "تعذر الاتصال بقاعدة البيانات",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save user to localStorage when it changes (only for session persistence)
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      localStorage.setItem("userLoggedIn", "true");
    }
  }, [currentUser]);

  const login = async (phoneNumber: string, password: string): Promise<boolean> => {
    console.log("Attempting login with:", { phoneNumber, password });
    
    // Check if admin
    if (phoneNumber === adminUser.phone && password === adminUser.password) {
      setCurrentUser(adminUser);
      toast({
        title: "✅ تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في لوحة التحكم",
      });
      return true;
    }

    // Check if student
    const student = students.find(s => s.phone === phoneNumber && s.password === password);
    if (student) {
      setCurrentUser({
        id: student.id,
        name: student.name,
        phone: student.phone,
        password: student.password,
        role: "student",
        code: student.code,
        group: student.group,
        grade: student.grade
      });
      toast({
        title: "✅ تم تسجيل الدخول بنجاح",
        description: `مرحباً ${student.name}`,
      });
      return true;
    }

    // Check if parent
    const parent = parents.find(p => p.phone === phoneNumber && p.password === password);
    if (parent) {
      const student = students.find(s => s.code === parent.studentCode);
      setCurrentUser({
        id: parent.id,
        name: `ولي أمر ${parent.studentName}`,
        phone: parent.phone,
        password: parent.password,
        role: "parent",
        childrenIds: student ? [student.id] : []
      });
      toast({
        title: "✅ تم تسجيل الدخول بنجاح",
        description: `مرحباً بك`,
      });
      return true;
    }

    toast({
      variant: "destructive",
      title: "❌ فشل تسجيل الدخول",
      description: "رقم الهاتف أو كلمة المرور غير صحيحة",
    });
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userLoggedIn");
    toast({
      title: "تم تسجيل الخروج",
      description: "نراك قريباً!",
    });
    
    // Play logout sound
    const audio = new Audio("/logout-sound.mp3");
    audio.volume = 0.5;
    audio.play().catch(e => console.error("Sound play failed:", e));
  };

  const createStudent = async (
    name: string,
    phone: string,
    parentPhone: string,
    group: string,
    grade: "first" | "second" | "third"
  ): Promise<Student> => {
    const code = generateRandomCode();
    const password = generateUniquePassword(students, parents);
    const id = generateId();
    
    try {
      // Insert into Turso
      await turso.execute({
        sql: `INSERT INTO students (id, name, phone, password, code, parent_phone, group_name, grade) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, name, phone, password, code, parentPhone, group, grade]
      });

      const newStudent: Student = {
        id,
        name,
        phone,
        password,
        code,
        parentPhone,
        group,
        grade,
        role: "student"
      };

      // Update local state
      setStudents(prev => [...prev, newStudent]);
      
      toast({
        title: "✅ تم إنشاء حساب الطالب بنجاح",
        description: `كود الطالب هو: ${code} | كلمة المرور: ${password}`,
      });
      
      return newStudent;
    } catch (error: any) {
      console.error("Failed to create student:", error);
      toast({
        title: "❌ خطأ في إنشاء حساب الطالب",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateStudent = async (
    id: string,
    name: string,
    phone: string,
    password: string,
    parentPhone: string,
    group: string,
    grade: "first" | "second" | "third"
  ): Promise<void> => {
    try {
      // Update in Turso
      await turso.execute({
        sql: `UPDATE students SET name = ?, phone = ?, password = ?, parent_phone = ?, 
              group_name = ?, grade = ? WHERE id = ?`,
        args: [name, phone, password, parentPhone, group, grade, id]
      });

      // Update local state
      const studentIndex = students.findIndex(s => s.id === id);
      if (studentIndex !== -1) {
        const updatedStudent = {
          ...students[studentIndex],
          name,
          phone,
          password,
          parentPhone,
          group,
          grade
        };

        const newStudents = [...students];
        newStudents[studentIndex] = updatedStudent;
        setStudents(newStudents);
      }

      toast({
        title: "✅ تم تحديث بيانات الطالب بنجاح",
        description: `تم تحديث بيانات ${name}`,
      });
    } catch (error: any) {
      console.error("Failed to update student:", error);
      toast({
        title: "❌ خطأ في تحديث بيانات الطالب",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteStudent = async (id: string): Promise<void> => {
    try {
      // Delete from Turso
      await turso.execute({
        sql: "DELETE FROM students WHERE id = ?",
        args: [id]
      });

      // Update local state
      setStudents(prev => prev.filter(student => student.id !== id));

      toast({
        title: "✅ تم حذف الطالب بنجاح",
        description: "تم حذف الطالب من النظام",
      });
    } catch (error: any) {
      console.error("Failed to delete student:", error);
      toast({
        title: "❌ خطأ في حذف الطالب",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createParent = async (phone: string, studentCode: string): Promise<Parent> => {
    const student = await getStudentByCode(studentCode);
    
    if (!student) {
      toast({
        variant: "destructive",
        title: "❌ خطأ",
        description: "كود الطالب غير صحيح",
      });
      throw new Error("Student code invalid");
    }

    const password = generateUniquePassword(students, parents);
    const id = generateId();
    
    try {
      // Insert into Turso
      await turso.execute({
        sql: `INSERT INTO parents (id, phone, student_code, student_name, password) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, phone, studentCode, student.name, password]
      });

      const newParent: Parent = {
        id,
        phone,
        studentCode,
        studentName: student.name,
        password
      };

      // Update local state
      setParents(prev => [...prev, newParent]);
      
      toast({
        title: "✅ تم إنشاء حساب ولي الأمر بنجاح",
        description: `مرتبط بالطالب: ${student.name} | كلمة المرور: ${password}`,
      });
      
      return newParent;
    } catch (error: any) {
      console.error("Failed to create parent:", error);
      toast({
        title: "❌ خطأ في إنشاء حساب ولي الأمر",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateParent = async (id: string, phone: string, studentCode: string, password: string): Promise<void> => {
    const student = await getStudentByCode(studentCode);
    
    if (!student) {
      toast({
        variant: "destructive",
        title: "❌ خطأ",
        description: "كود الطالب غير صحيح",
      });
      throw new Error("Student code invalid");
    }

    try {
      // Update in Turso
      await turso.execute({
        sql: `UPDATE parents SET phone = ?, student_code = ?, student_name = ?, password = ? WHERE id = ?`,
        args: [phone, studentCode, student.name, password, id]
      });

      // Update local state
      const parentIndex = parents.findIndex(p => p.id === id);
      if (parentIndex !== -1) {
        const updatedParent = {
          ...parents[parentIndex],
          phone,
          studentCode,
          studentName: student.name,
          password
        };

        const newParents = [...parents];
        newParents[parentIndex] = updatedParent;
        setParents(newParents);
        
        // إذا كان هذا ولي الأمر هو المستخدم الحالي، تحديث بيانات المستخدم أيضًا
        if (currentUser && currentUser.id === id && currentUser.role === "parent") {
          setCurrentUser({
            ...currentUser,
            name: `ولي أمر ${student.name}`,
            phone,
            password,
            childrenIds: [student.id]
          });
        }
      }

      toast({
        title: "✅ تم تحديث بيانات ولي الأمر بنجاح",
        description: `تم تحديث بيانات ولي أمر ${student.name}`,
      });
    } catch (error: any) {
      console.error("Failed to update parent:", error);
      toast({
        title: "❌ خطأ في تحديث بيانات ولي الأمر",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteParent = async (id: string): Promise<void> => {
    // إذا كان هذا ولي الأمر هو المستخدم الحالي، تسجيل الخروج أولاً
    if (currentUser && currentUser.id === id && currentUser.role === "parent") {
      logout();
    }
    
    try {
      // Delete from Turso
      await turso.execute({
        sql: "DELETE FROM parents WHERE id = ?",
        args: [id]
      });

      // Update local state
      setParents(prev => prev.filter(parent => parent.id !== id));

      toast({
        title: "✅ تم حذف ولي الأمر بنجاح",
        description: "تم حذف ولي الأمر من النظام",
      });
    } catch (error: any) {
      console.error("Failed to delete parent:", error);
      toast({
        title: "❌ خطأ في حذف ولي الأمر",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getStudentByCode = async (code: string): Promise<Student | undefined> => {
    try {
      // Always fetch from Turso as primary source
      const result = await turso.execute({
        sql: "SELECT * FROM students WHERE code = ?",
        args: [code]
      });

      if (result.rows && result.rows.length > 0) {
        const student = result.rows[0] as any;
        return {
          id: student.id,
          name: student.name,
          phone: student.phone,
          password: student.password,
          code: student.code,
          parentPhone: student.parent_phone,
          group: student.group_name,
          grade: student.grade as "first" | "second" | "third",
          role: "student"
        };
      }
    } catch (error) {
      console.error("Failed to get student by code:", error);
    }

    // Fall back to local data
    return students.find(student => student.code === code);
  };

  const getAllStudents = (): Student[] => {
    return students;
  };

  const getAllParents = (): Parent[] => {
    return parents;
  };

  const value = {
    currentUser,
    students,
    parents,
    login,
    logout,
    createStudent,
    updateStudent,
    deleteStudent,
    createParent,
    updateParent,
    deleteParent,
    getStudentByCode,
    getAllStudents,
    getAllParents,
  };

  // Show loading state while initializing data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-physics-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-physics-gold text-lg">جاري تحميل البيانات من قاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
