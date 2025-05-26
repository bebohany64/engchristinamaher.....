
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { PhoneContact } from "@/components/PhoneContact";
import { ArrowRight, FilePlus, Calendar, Search, Edit, Trash, X, FileText, Download } from "lucide-react";
import { FileUploader } from "@/components/FileUploader";
import { toast } from "@/hooks/use-toast";
import { turso, generateId } from "@/integrations/turso/client";

const Books = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<"all" | "first" | "second" | "third">("all");
  const [books, setBooks] = useState<{id: string, title: string, url: string, grade: string, uploadDate: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // حالة النموذج
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [grade, setGrade] = useState<"first" | "second" | "third">("first");

  // حالة التعديل
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editGrade, setEditGrade] = useState<"first" | "second" | "third">("first");
  
  // استدعاء البيانات من Turso
  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      let query = "SELECT * FROM books ORDER BY upload_date DESC";
      
      if (selectedGrade !== 'all') {
        query = `SELECT * FROM books WHERE grade = '${selectedGrade}' ORDER BY upload_date DESC`;
      }
      
      const result = await turso.execute(query);
      
      if (result.rows) {
        const mappedBooks = result.rows.map((book: any) => ({
          id: book.id,
          title: book.title,
          url: book.url,
          grade: book.grade,
          uploadDate: book.upload_date || new Date().toISOString()
        }));
        setBooks(mappedBooks);
        console.log("تم تحميل الكتب من Turso:", mappedBooks);
      }
    } catch (error) {
      console.error("Error fetching books from Turso:", error);
      toast({
        variant: "destructive",
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء محاولة تحميل الكتب والملفات"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // استدعاء البيانات عند تحميل الصفحة أو تغيير التصفية
  useEffect(() => {
    fetchBooks();
  }, [selectedGrade]);
  
  // تصفية البيانات حسب البحث
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    
    try {
      const id = generateId();
      const uploadDate = new Date().toISOString();
      
      // إضافة إلى Turso
      await turso.execute({
        sql: "INSERT INTO books (id, title, url, grade, upload_date) VALUES (?, ?, ?, ?, ?)",
        args: [id, title, url, grade, uploadDate]
      });
      
      toast({
        title: "تم إضافة الملف",
        description: "تم إضافة الملف بنجاح"
      });
      
      // إعادة تحميل البيانات
      fetchBooks();
      
      // إعادة تعيين النموذج
      setTitle("");
      setUrl("");
      setGrade("first");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding book to Turso:", error);
      toast({
        variant: "destructive",
        title: "خطأ في إضافة الملف",
        description: "حدث خطأ أثناء محاولة إضافة الملف"
      });
    }
  };
  
  const handleFileURLGenerated = (generatedUrl: string) => {
    setUrl(generatedUrl);
  };
  
  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // تحديث في Turso
      await turso.execute({
        sql: "UPDATE books SET title = ?, url = ?, grade = ? WHERE id = ?",
        args: [editTitle, editUrl, editGrade, editId]
      });
      
      toast({
        title: "تم تحديث الملف",
        description: "تم تحديث الملف بنجاح"
      });
      
      // إعادة تحميل البيانات
      fetchBooks();
      
      // إغلاق نموذج التعديل
      setShowEditForm(false);
    } catch (error) {
      console.error("Error updating book in Turso:", error);
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الملف",
        description: "حدث خطأ أثناء محاولة تحديث الملف"
      });
    }
  };
  
  const handleDeleteBook = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الملف؟")) {
      try {
        // حذف من Turso
        await turso.execute({
          sql: "DELETE FROM books WHERE id = ?",
          args: [id]
        });
        
        toast({
          title: "تم حذف الملف",
          description: "تم حذف الملف بنجاح"
        });
        
        // إعادة تحميل البيانات
        fetchBooks();
      } catch (error) {
        console.error("Error deleting book from Turso:", error);
        toast({
          variant: "destructive",
          title: "خطأ في حذف الملف",
          description: "حدث خطأ أثناء محاولة حذف الملف"
        });
      }
    }
  };
  
  const openEditForm = (book: any) => {
    setEditId(book.id);
    setEditTitle(book.title);
    setEditUrl(book.url);
    setEditGrade(book.grade);
    setShowEditForm(true);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-physics-navy flex flex-col relative">
      <PhoneContact />
      
      {/* Header */}
      <header className="bg-physics-dark py-4 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-physics-gold hover:opacity-80">
            <ArrowRight size={20} />
            <span>العودة للرئيسية</span>
          </button>
        </div>
        <Logo />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-physics-gold">الكتب والملفات التعليمية</h1>
            {currentUser?.role === "admin" && <button onClick={() => setShowAddForm(true)} className="goldBtn flex items-center gap-2">
                <FilePlus size={18} />
                <span>إضافة ملف</span>
              </button>}
          </div>
          
          {/* التصفية والبحث */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="w-full md:w-1/3">
              <select 
                className="inputField" 
                value={selectedGrade} 
                onChange={e => setSelectedGrade(e.target.value as "all" | "first" | "second" | "third")}
              >
                <option value="all">جميع الصفوف</option>
                <option value="first">الصف الأول الثانوي</option>
                <option value="second">الصف الثاني الثانوي</option>
                <option value="third">الصف الثالث الثانوي</option>
              </select>
            </div>
            
            <div className="relative w-full md:w-2/3">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-physics-gold" size={20} />
              <input 
                type="text" 
                className="inputField pr-12" 
                placeholder="ابحث عن كتاب أو ملف" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
          
          {/* حالة التحميل */}
          {isLoading && (
            <div className="bg-physics-dark rounded-lg p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-physics-gold border-t-transparent rounded-full animate-spin"></div>
              <p className="text-white mt-3">جاري تحميل البيانات...</p>
            </div>
          )}
          
          {/* قائمة الكتب والملفات */}
          {!isLoading && (
            <div className="bg-physics-dark rounded-lg overflow-hidden">
              {filteredBooks.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-white text-lg">لا توجد ملفات متاحة</p>
                </div>
              ) : (
                <div className="divide-y divide-physics-navy">
                  {filteredBooks.map(book => (
                    <div key={book.id} className="p-4 hover:bg-physics-navy/30">
                      <div className="flex items-center">
                        <div className="mr-4 bg-physics-navy p-3 rounded-full">
                          <FileText size={24} className="text-physics-gold" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-white">{book.title}</h3>
                          </div>
                          <div className="flex items-center text-sm text-gray-300 mt-1">
                            <Calendar size={14} className="ml-1" />
                            <span>{formatDate(book.uploadDate)}</span>
                            <span className="mx-2">•</span>
                            <span>
                              {book.grade === "first" && "الصف الأول الثانوي"}
                              {book.grade === "second" && "الصف الثاني الثانوي"}
                              {book.grade === "third" && "الصف الثالث الثانوي"}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <a href={book.url} target="_blank" rel="noopener noreferrer" className="p-2 text-physics-gold hover:text-white">
                            <Download size={18} />
                          </a>
                          
                          {currentUser?.role === "admin" && (
                            <div className="flex">
                              <button onClick={() => openEditForm(book)} className="p-2 text-physics-gold hover:text-white">
                                <Edit size={18} />
                              </button>
                              
                              <button onClick={() => handleDeleteBook(book.id)} className="p-2 text-red-500 hover:text-white">
                                <Trash size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* نموذج إضافة كتاب */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-physics-dark rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-physics-gold">إضافة ملف جديد</h2>
              <button type="button" className="text-gray-400 hover:text-white" onClick={() => setShowAddForm(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-white mb-1">عنوان الملف</label>
                <input type="text" className="inputField" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              
              <div>
                <label className="block text-white mb-1">رابط الملف</label>
                <FileUploader onFileURLGenerated={handleFileURLGenerated} />
                {url && (
                  <p className="text-xs text-gray-400 mt-1">
                    تم رفع الملف بنجاح: {url}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-white mb-1">الصف الدراسي</label>
                <select className="inputField" value={grade} onChange={e => setGrade(e.target.value as "first" | "second" | "third")} required>
                  <option value="first">الصف الأول الثانوي</option>
                  <option value="second">الصف الثاني الثانوي</option>
                  <option value="third">الصف الثالث الثانوي</option>
                </select>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="submit" className="goldBtn flex-1" disabled={!url || !title}>
                  إضافة الملف
                </button>
                <button type="button" className="bg-physics-navy text-white py-2 px-4 rounded-lg flex-1" onClick={() => setShowAddForm(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* نموذج تعديل الكتاب */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-physics-dark rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-physics-gold mb-6">تعديل الملف</h2>
            
            <form onSubmit={handleEditBook} className="space-y-4">
              <div>
                <label className="block text-white mb-1">عنوان الملف</label>
                <input type="text" className="inputField" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
              </div>
              
              <div>
                <label className="block text-white mb-1">رابط الملف</label>
                <input type="text" className="inputField" value={editUrl} onChange={e => setEditUrl(e.target.value)} required />
              </div>
              
              <div>
                <label className="block text-white mb-1">الصف الدراسي</label>
                <select className="inputField" value={editGrade} onChange={e => setEditGrade(e.target.value as "first" | "second" | "third")} required>
                  <option value="first">الصف الأول الثانوي</option>
                  <option value="second">الصف الثاني الثانوي</option>
                  <option value="third">الصف الثالث الثانوي</option>
                </select>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="submit" className="goldBtn flex-1">
                  حفظ التغييرات
                </button>
                <button type="button" className="bg-physics-navy text-white py-2 px-4 rounded-lg flex-1" onClick={() => setShowEditForm(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;
