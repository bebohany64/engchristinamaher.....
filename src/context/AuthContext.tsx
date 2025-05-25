
import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Student, Parent } from "@/types";
import { generateRandomCode, generateUniquePassword } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

  // Load data from Supabase on initial mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
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
        
        // Always fetch students from Supabase as primary source
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*');
          
        if (studentsError) {
          console.error("Error fetching students:", studentsError);
          toast({
            title: "خطأ في تحميل بيانات الطلاب",
            description: "تعذر تحميل بيانات الطلاب من قاعدة البيانات",
            variant: "destructive"
          });
        } else {
          // Map Supabase data to Student type
          const formattedStudents: Student[] = studentsData.map(student => ({
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
        }
        
        // Always fetch parents from Supabase as primary source
        const { data: parentsData, error: parentsError } = await supabase
          .from('parents')
          .select('*');
          
        if (parentsError) {
          console.error("Error fetching parents:", parentsError);
          toast({
            title: "خطأ في تحميل بيانات أولياء الأمور",
            description: "تعذر تحميل بيانات أولياء الأمور من قاعدة البيانات",
            variant: "destructive"
          });
        } else {
          // Map Supabase data to Parent type
          const formattedParents: Parent[] = parentsData.map(parent => ({
            id: parent.id,
            phone: parent.phone,
            studentCode: parent.student_code,
            studentName: parent.student_name,
            password: parent.password
          }));
          setParents(formattedParents);
        }
      } catch (error) {
        console.error("Error loading data from Supabase:", error);
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
    
    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('students')
        .insert({
          name: name,
          phone: phone,
          password: password,
          code: code,
          parent_phone: parentPhone,
          group_name: group,
          grade: grade
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating student in Supabase:", error);
        throw new Error(`فشل في إنشاء حساب الطالب: ${error.message}`);
      }

      // Update student with Supabase ID
      const serverStudent: Student = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        password: data.password,
        code: data.code,
        parentPhone: data.parent_phone,
        group: data.group_name,
        grade: data.grade as "first" | "second" | "third",
        role: "student"
      };

      // Update local state
      setStudents(prev => [...prev, serverStudent]);
      
      toast({
        title: "✅ تم إنشاء حساب الطالب بنجاح",
        description: `كود الطالب هو: ${code} | كلمة المرور: ${password}`,
      });
      
      return serverStudent;
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
      // Update in Supabase
      const { error } = await supabase
        .from('students')
        .update({
          name: name,
          phone: phone,
          password: password,
          parent_phone: parentPhone,
          group_name: group,
          grade: grade
        })
        .eq('id', id);

      if (error) {
        console.error("Error updating student in Supabase:", error);
        throw new Error(`فشل في تحديث بيانات الطالب: ${error.message}`);
      }

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
      // Delete from Supabase
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting student from Supabase:", error);
        throw new Error(`فشل في حذف الطالب: ${error.message}`);
      }

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
    
    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('parents')
        .insert({
          phone: phone,
          student_code: studentCode,
          student_name: student.name,
          password: password
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating parent in Supabase:", error);
        throw new Error(`فشل في إنشاء حساب ولي الأمر: ${error.message}`);
      }

      // Update parent with Supabase ID
      const serverParent: Parent = {
        id: data.id,
        phone: data.phone,
        studentCode: data.student_code,
        studentName: data.student_name,
        password: data.password
      };

      // Update local state
      setParents(prev => [...prev, serverParent]);
      
      toast({
        title: "✅ تم إنشاء حساب ولي الأمر بنجاح",
        description: `مرتبط بالطالب: ${student.name} | كلمة المرور: ${password}`,
      });
      
      return serverParent;
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
      // Update in Supabase
      const { error } = await supabase
        .from('parents')
        .update({
          phone: phone,
          student_code: studentCode,
          student_name: student.name,
          password: password
        })
        .eq('id', id);

      if (error) {
        console.error("Error updating parent in Supabase:", error);
        throw new Error(`فشل في تحديث بيانات ولي الأمر: ${error.message}`);
      }

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
      // Delete from Supabase
      const { error } = await supabase
        .from('parents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting parent from Supabase:", error);
        throw new Error(`فشل في حذف ولي الأمر: ${error.message}`);
      }

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
      // Always fetch from Supabase as primary source
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        console.error("Error fetching student by code from Supabase:", error);
        // Fall back to local data only if Supabase fails
        return students.find(student => student.code === code);
      }

      if (data) {
        return {
          id: data.id,
          name: data.name,
          phone: data.phone,
          password: data.password,
          code: data.code,
          parentPhone: data.parent_phone,
          group: data.group_name,
          grade: data.grade as "first" | "second" | "third",
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
