import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import StudyMaterial from './pages/StudyMaterial';
import MyUploads from './pages/MyUploads';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/admin/Users';
import AdminPendingFiles from './pages/admin/PendingFiles';
import Unauthorized from './pages/Unauthorized';
import Recent from './pages/Recent';
import Projects from './pages/Projects';
import PYQ from './pages/PYQ';
import Notes from './pages/Notes';
import LabManual from './pages/LabManual';
import ChatDiscussion from './pages/ChatDiscussion';
import PersonalFiles from './pages/PersonalFiles';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider } from './context/AuthContext';
import { FileProvider } from './context/FileContext';
import { ChatProvider } from './context/ChatContext';
import { GeneralChatProvider } from './context/GeneralChatContext';
import StudyMaterialProvider from './context/StudyMaterialContext';
import StudyMaterials from './pages/StudyMaterials';
import AdminStudyMaterials from './pages/AdminStudyMaterials';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <AuthProvider>
      <FileProvider>
        <ChatProvider>
          <StudyMaterialProvider>
            <GeneralChatProvider>
              <Router>
                <Layout>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/study-material" element={<StudyMaterial />} />
                    <Route path="/study-materials" element={<StudyMaterials />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/chat-discussion" element={<ChatDiscussion />} />
                    
                    {/* Protected Routes - User */}
                    <Route path="/recent" element={
                      <PrivateRoute>
                        <Recent />
                      </PrivateRoute>
                    } />
                    <Route path="/my-uploads" element={
                      <PrivateRoute>
                        <MyUploads />
                      </PrivateRoute>
                    } />
                    <Route path="/personal-files" element={
                      <PrivateRoute>
                        <PersonalFiles />
                      </PrivateRoute>
                    } />
                    <Route path="/projects" element={
                      <PrivateRoute>
                        <Projects />
                      </PrivateRoute>
                    } />
                    <Route path="/pyq" element={
                      <PrivateRoute>
                        <PYQ />
                      </PrivateRoute>
                    } />
                    <Route path="/notes" element={
                      <PrivateRoute>
                        <Notes />
                      </PrivateRoute>
                    } />
                    <Route path="/lab-manual" element={
                      <PrivateRoute>
                        <LabManual />
                      </PrivateRoute>
                    } />
                    <Route path="/saved" element={
                      <PrivateRoute>
                        <Saved />
                      </PrivateRoute>
                    } />
                    <Route path="/profile" element={
                      <PrivateRoute>
                        <Profile />
                      </PrivateRoute>
                    } />
                    <Route path="/user-dashboard" element={
                      <PrivateRoute>
                        <UserDashboard />
                      </PrivateRoute>
                    } />
                    
                    {/* Protected Routes - Admin */}
                    <Route path="/admin/dashboard" element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    } />
                    <Route path="/admin/users" element={
                      <AdminRoute>
                        <AdminUsers />
                      </AdminRoute>
                    } />
                    <Route path="/admin/pending-files" element={
                      <AdminRoute>
                        <AdminPendingFiles />
                      </AdminRoute>
                    } />
                    <Route path="/admin/study-materials" element={
                      <AdminRoute>
                        <AdminStudyMaterials />
                      </AdminRoute>
                    } />
                  </Routes>
                </Layout>
              </Router>
            </GeneralChatProvider>
          </StudyMaterialProvider>
        </ChatProvider>
      </FileProvider>
    </AuthProvider>
  );
}

export default App;
