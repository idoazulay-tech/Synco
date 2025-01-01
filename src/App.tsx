import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import DayViewPage from "./pages/DayViewPage";
import MonthViewPage from "./pages/MonthViewPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import AddTaskPage from "./pages/AddTaskPage";
import StandbyPage from "./pages/StandbyPage";
import SettingsPage from "./pages/SettingsPage";
import StatisticsPage from "./pages/StatisticsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/day" element={<DayViewPage />} />
          <Route path="/month" element={<MonthViewPage />} />
          <Route path="/task/:id" element={<TaskDetailPage />} />
          <Route path="/add" element={<AddTaskPage />} />
          <Route path="/standby" element={<StandbyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
