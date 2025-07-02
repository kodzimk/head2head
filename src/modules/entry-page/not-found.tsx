import { Button } from "../../shared/ui/button";
import { useNavigate } from "react-router-dom";
import { Home, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-orange-100 p-4">
      <div className="text-center max-w-md mx-auto">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-orange-500" />
          </div>
          <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t('errors.notFound')}</h2>
        </div>

        {/* Message */}
        <div className="mb-8">
          <p className="text-gray-600 text-lg mb-2">
            {t('errors.pageNotFoundMessage')}
          </p>
          <p className="text-gray-500">
            {t('errors.pageNotFoundDesc')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            onClick={handleGoHome}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            {t('common.goToHomepage')}
          </Button>
          
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full border-gray-300 hover:bg-gray-50"
          >
            {t('common.goBack')}
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {t('errors.needHelp')}{" "}
            <button 
              onClick={() => navigate("/")}
              className="text-orange-500 hover:text-orange-600 underline"
            >
              {t('navigation.home')}
            </button>{" "}
            {t('errors.forMoreInfo')}
          </p>
        </div>
      </div>
    </div>
  );
} 