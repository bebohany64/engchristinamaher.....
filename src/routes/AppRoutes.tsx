
import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";

// Import all pages
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import StudentsManagement from "@/pages/StudentsManagement";
import ParentsManagement from "@/pages/ParentsManagement";
import ScanCode from "@/pages/ScanCode";
import Videos from "@/pages/Videos";
import Books from "@/pages/Books";
import StudentCode from "@/pages/StudentCode";
import AttendanceRecord from "@/pages/AttendanceRecord";
import Grades from "@/pages/Grades";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";
import AttendanceRecordList from "@/pages/AttendanceRecordList";
import AttendanceListByGrade from "@/pages/AttendanceListByGrade";
import GradesManagement from "@/pages/GradesManagement";
import GradesByGrade from "@/pages/GradesByGrade";
import StudentGrades from "@/pages/StudentGrades";
import PaymentsManagement from "@/pages/PaymentsManagement";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<RequireAuth children={<Dashboard />} />} />
      
      {/* Admin Routes */}
      <Route path="/students" element={<RequireAuth allowedRoles={["admin"]} children={<StudentsManagement />} />} />
      <Route path="/parents" element={<RequireAuth allowedRoles={["admin"]} children={<ParentsManagement />} />} />
      <Route path="/scan-code" element={<RequireAuth allowedRoles={["admin"]} children={<ScanCode />} />} />
      <Route path="/attendance-list" element={<RequireAuth allowedRoles={["admin"]} children={<AttendanceRecordList />} />} />
      <Route path="/attendance-list/:grade" element={<RequireAuth allowedRoles={["admin"]} children={<AttendanceListByGrade />} />} />
      <Route path="/grades-management" element={<RequireAuth allowedRoles={["admin"]} children={<GradesManagement />} />} />
      <Route path="/grades-management/:grade" element={<RequireAuth allowedRoles={["admin"]} children={<GradesByGrade />} />} />
      <Route path="/payments" element={<RequireAuth allowedRoles={["admin"]} children={<PaymentsManagement />} />} />
      
      {/* Student Routes */}
      <Route path="/student-code" element={<RequireAuth allowedRoles={["student"]} children={<StudentCode />} />} />
      <Route path="/student-grades" element={<RequireAuth allowedRoles={["student"]} children={<StudentGrades />} />} />
      
      {/* All Users Routes */}
      <Route path="/videos" element={<RequireAuth allowedRoles={["admin", "student"]} children={<Videos />} />} />
      <Route path="/books" element={<RequireAuth allowedRoles={["admin", "student"]} children={<Books />} />} />
      
      {/* Parent & Student Routes */}
      <Route path="/attendance-record" element={<RequireAuth allowedRoles={["parent", "student"]} children={<AttendanceRecord />} />} />
      <Route path="/grades" element={<RequireAuth allowedRoles={["parent", "student"]} children={<Grades />} />} />
      
      {/* Auth error routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
