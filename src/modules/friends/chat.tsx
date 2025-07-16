import React, { useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { useNavigate } from 'react-router-dom';

const ChatInterface: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/friends');
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-transparent rounded-2xl overflow-hidden relative">
        {/* Back Button - Positioned outside the absolute overlay */}
        <div className="absolute top-0 left-0 z-60 p-4 w-full">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleGoBack}
            className="hover:bg-accent bg-white/20 backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 pt-16">
          <div className="text-center text-white max-w-md space-y-4 sm:space-y-6 bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Chat Feature Coming Soon!</h2>
            <p className="text-base sm:text-lg md:text-xl text-white/90 drop-shadow-md">We're working hard to bring you an amazing chat experience. 
            Stay tuned for real-time messaging, instant connections, and seamless communication 
            with your friends and fellow competitors.</p>
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-3 sm:p-4 rounded-lg">
              <p className="text-white italic text-sm sm:text-base md:text-lg drop-shadow-md">
                "Great conversations are just around the corner. Get ready to connect like never before!"
              </p>
            </div>
          </div>
        </div>

        {/* Existing chat interface (now completely disabled) */}
        <div className="flex-grow h-96 overflow-y-auto p-4 opacity-0 pointer-events-none">
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 