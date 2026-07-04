import { Navigate, Route, Routes } from "react-router-dom";
import { AdminDashboard } from "../dashboards/admin/AdminDashboard";
import { CropPriceManagementPage } from "../dashboards/admin/CropPriceManagementPage";
import { EscalatedComplaintsPage } from "../dashboards/admin/EscalatedComplaintsPage";
import { ManageExpertsPage } from "../dashboards/admin/ManageExpertsPage";
import { TalukAdminsPage } from "../dashboards/admin/TalukAdminsPage";
import { ConsumerDashboard } from "../dashboards/consumer/ConsumerDashboard";
import ConsumerMarketplacePage from "../consumer/marketplace/page";
import { CheckoutPage as ConsumerCheckoutPage } from "../consumer/marketplace/components/CheckoutPage";
import { OrderSuccess as ConsumerOrderSuccessPage } from "../consumer/marketplace/components/OrderSuccess";
import { DeliveryDashboard } from "../dashboards/delivery/DeliveryDashboard";
import DeliveryFarmMap from "../delivery/pages/DeliveryFarmMap/DeliveryFarmMap";
import { ExpertDashboard } from "../dashboards/expert/ExpertDashboard";
import { FarmerComplaintPage } from "../dashboards/farmer/FarmerComplaintPage";
import { FarmerDashboard } from "../dashboards/farmer/FarmerDashboard";
import { FarmerRecommendedPricesPage } from "../dashboards/farmer/FarmerRecommendedPricesPage";
import { ThozhilInaipuPage } from "../pages/farmer/ThozhilInaipu";
import { TalukComplaintsPage } from "../dashboards/taluk/TalukComplaintsPage";
import { TalukDashboard } from "../dashboards/taluk/TalukDashboard";
import { getDashboardPathByRole, useAuth } from "../context/AuthContext";
import { AIChatPage } from "../features/ai/AIChatPage";
import { ChatPage } from "../features/chat/ChatPage";
import { UzhavarVattamFeed } from "../features/community/pages/UzhavarVattamFeed";
import { ExpertChatDashboard } from "../features/expertConsultation/pages/ExpertChatDashboard";
import { FarmerExpertConsultationPage } from "../features/expertConsultation/pages/FarmerExpertConsultationPage";
import { FarmerChatbotPage } from "../features/farmer/chatbot/pages/FarmerChatbotPage";
import { SubmitGrievancePage } from "../features/grievance/SubmitGrievancePage";
import { TrackGrievancePage } from "../features/grievance/TrackGrievancePage";
import { ProductDetailPage } from "../features/marketplace/ProductDetailPage";
import { ProductListPage } from "../features/marketplace/ProductListPage";
import { CreateListingPage } from "../features/marketplace/pages/CreateListing";
import { MarketplaceHome } from "../features/marketplace/pages/MarketplaceHome";
import { MyListingsPage } from "../features/marketplace/pages/MyListings";
import { SchemeDetailPage } from "../features/schemes/SchemeDetailPage";
import { SchemesPage } from "../features/schemes/SchemesPage";
import { LoginPage } from "../pages/Login";
import { RegisterPage } from "../pages/Register";
import { LandingPage } from "../pages/LandingPage";
import { AuthenticatedRoute } from "./AuthenticatedRoute";
import { ProtectedRoute } from "./ProtectedRoute";

function DashboardLandingRedirect() {
  const { auth, isAuthenticated } = useAuth();
  if (!isAuthenticated || !auth) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPathByRole(auth.role)} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardLandingRedirect />} />

      <Route element={<AuthenticatedRoute />}>
        <Route path="/marketplace" element={<ProductListPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/community" element={<UzhavarVattamFeed />} />
        <Route path="/schemes" element={<SchemesPage />} />
        <Route path="/schemes/:id" element={<SchemeDetailPage />} />
        <Route path="/grievances" element={<SubmitGrievancePage />} />
        <Route path="/grievances/track" element={<TrackGrievancePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/ai" element={<AIChatPage />} />
      </Route>

      <Route element={<ProtectedRoute requiredRole="FARMER" />}>
        <Route path="/dashboard/farmer" element={<FarmerDashboard />} />
        <Route path="/dashboard/farmer/marketplace" element={<MarketplaceHome />} />
        <Route path="/dashboard/farmer/marketplace/create" element={<CreateListingPage />} />
        <Route path="/dashboard/farmer/marketplace/my-listings" element={<MyListingsPage />} />
        <Route path="/dashboard/farmer/recommended-prices" element={<FarmerRecommendedPricesPage />} />
        <Route path="/dashboard/farmer/chatbot" element={<FarmerChatbotPage />} />
        <Route path="/dashboard/farmer/expert-consultation" element={<FarmerExpertConsultationPage />} />
        <Route path="/dashboard/farmer/complaints" element={<FarmerComplaintPage />} />
        <Route path="/farmer/thozhil-inaipu" element={<ThozhilInaipuPage />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/admin/crop-prices" element={<CropPriceManagementPage />} />
        <Route path="/dashboard/admin/experts" element={<ManageExpertsPage />} />
        <Route path="/dashboard/admin/taluk-admins" element={<TalukAdminsPage />} />
        <Route path="/admin/escalated-complaints" element={<EscalatedComplaintsPage />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="TALUK_ADMIN" />}>
        <Route path="/dashboard/taluk" element={<TalukDashboard />} />
        <Route path="/dashboard/taluk/complaints" element={<TalukComplaintsPage />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="EXPERT" />}>
        <Route path="/dashboard/expert" element={<ExpertDashboard />} />
        <Route path="/expert/dashboard" element={<ExpertChatDashboard />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="CONSUMER" />}>
        <Route path="/dashboard/consumer" element={<ConsumerDashboard />} />
        <Route path="/dashboard/consumer/marketplace" element={<ConsumerMarketplacePage />} />
        <Route path="/dashboard/consumer/marketplace/checkout" element={<ConsumerCheckoutPage />} />
        <Route path="/dashboard/consumer/marketplace/success" element={<ConsumerOrderSuccessPage />} />
      </Route>
      <Route element={<ProtectedRoute requiredRole="DELIVERY" />}>
        <Route path="/dashboard/delivery" element={<DeliveryDashboard />} />
        <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
        <Route path="/delivery/farm-map" element={<DeliveryFarmMap />} />
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="/LandingPage" element={<LandingPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
