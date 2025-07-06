
import { Card } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { ChevronUp, MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Comments from './comments';
import type { Selection } from './types.js';

interface SelectionDetailProps {
  selection: Selection;
  onClose: () => void;
  onVote: (team: 'A' | 'B') => void;
  onAddComment: (content: string) => void;
  onLikeComment: (commentId: string) => void;
  hasVoted: boolean;
}

export default function SelectionDetail({
  selection,
  onClose,
  onVote,
  onAddComment,
  onLikeComment,
  hasVoted
}: SelectionDetailProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed inset-x-0 top-0 bottom-0 md:inset-x-auto md:left-[280px] md:w-[500px] bg-background border-l border-r border-border overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <h2 className="text-lg font-semibold">{t('selection.title')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <Card className="overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-muted-foreground capitalize">
                  {t(`selection.categories.${selection.category}`)}
                </span>
              </div>

              <div className="flex justify-between items-center gap-4">
                {/* Team A */}
                <div className="flex-1 text-center">
                  <h3 className="font-semibold mb-2">{selection.teamA.name}</h3>
                  <Button
                    onClick={() => onVote('A')}
                    disabled={hasVoted}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <ChevronUp className="w-4 h-4 mr-1" />
                    {selection.teamA.votes}
                  </Button>
                </div>

                <div className="text-2xl font-bold text-muted-foreground">VS</div>

                {/* Team B */}
                <div className="flex-1 text-center">
                  
                  <h3 className="font-semibold mb-2">{selection.teamB.name}</h3>
                  <Button
                    onClick={() => onVote('B')}
                    disabled={hasVoted}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <ChevronUp className="w-4 h-4 mr-1" />
                    {selection.teamB.votes}
                  </Button>
                </div>
              </div>

              {/* Vote Progress Bar */}
              <div className="mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${(selection.teamA.votes / (selection.teamA.votes + selection.teamB.votes)) * 100}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>{Math.round((selection.teamA.votes / (selection.teamA.votes + selection.teamB.votes)) * 100)}%</span>
                  <span>{Math.round((selection.teamB.votes / (selection.teamA.votes + selection.teamB.votes)) * 100)}%</span>
                </div>
              </div>

              {/* Comments Section */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="w-4 h-4" />
                  <h3 className="font-semibold">{t('selection.comments')}</h3>
                </div>
                <Comments
                  comments={selection.comments}
                  onAddComment={onAddComment}
                  onLikeComment={onLikeComment}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 