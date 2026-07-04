import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { AIChatPage } from "../features/ai/AIChatPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ChatPage } from "../features/chat/ChatPage";
import { BlogDetailPage } from "../features/community/BlogDetailPage";
import { CommunityPage } from "../features/community/CommunityPage";
import { CreateBlogPage } from "../features/community/CreateBlogPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SubmitGrievancePage } from "../features/grievance/SubmitGrievancePage";
import { TrackGrievancePage } from "../features/grievance/TrackGrievancePage";
import { LandingPage } from "../features/landing/LandingPage";
import { ProductDetailPage } from "../features/marketplace/ProductDetailPage";
import { ProductListPage } from "../features/marketplace/ProductListPage";
import { SchemeDetailPage } from "../features/schemes/SchemeDetailPage";
import { SchemesPage } from "../features/schemes/SchemesPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/marketplace" element={<ProductListPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/create" element={<CreateBlogPage />} />
        <Route path="/community/:id" element={<BlogDetailPage />} />
        <Route path="/schemes" element={<SchemesPage />} />
        <Route path="/schemes/:id" element={<SchemeDetailPage />} />
        <Route path="/grievances" element={<SubmitGrievancePage />} />
        <Route path="/grievances/track" element={<TrackGrievancePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/ai" element={<AIChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
