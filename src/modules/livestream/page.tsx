import React from 'react';
import { Card } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { useTranslation } from 'react-i18next';
import Header from '../dashboard/header';

export const LiveStreamPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <Card className="max-w-xl w-full p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('livestream.title')}</h1>
          <div className="space-y-4">
            <p className="text-xl text-yellow-600 font-semibold">
              {t('livestream.onDevelopment')}
            </p>
            <p className="text-lg text-gray-600">
              {t('livestream.comingSoon')}
            </p>
            <div className="flex justify-center mt-6">
              <Button variant="outline" className="opacity-50 cursor-not-allowed">
                {t('livestream.notifyMe')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}; 