import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Heart } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../../shared/ui/avatar';
import { Textarea } from '../../shared/ui/textarea';
import type { Comment } from './types';


interface DebateCommentsProps {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  onLikeComment: (commentId: string, isReply?: boolean, parentId?: string) => void;
  isLoading?: boolean;
  error?: string;
  currentUser: {
    id: string;
    name: string;
  };
}

export default function DebateComments({
  comments,
  onAddComment,
  onLikeComment,
  isLoading,
  error,
  currentUser
}: DebateCommentsProps) {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAddComment(newComment.trim());
        setNewComment('');
      } finally {
        setIsSubmitting(false);
      }
    }
  };


  const getCommentDate = (comment: Comment): Date => {
    if (comment.createdAt) return new Date(comment.createdAt);
    if (comment.timestamp) return new Date(comment.timestamp);
    return new Date(0); // fallback to epoch
  };

  const getRelativeTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const sortComments = (commentsToSort: Comment[]): Comment[] => {
    return [...commentsToSort].sort((a, b) => {
      return getCommentDate(b).getTime() - getCommentDate(a).getTime();
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const commentDate = getCommentDate(comment);

    return (
      <Card key={comment.id} className={`bg-muted/50 ${isReply ? 'ml-8' : ''} mb-4`}>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={`https://placehold.co/32x32/6366f1/ffffff?text=${comment.authorName?.charAt(0) || 'U'}`} 
                alt={comment.authorName}
              />
              <AvatarFallback>{comment.authorName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-primary">{comment.authorName}</span>
                {comment.authorId === currentUser.id && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {t('selection.you')}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(commentDate)}
                </span>
              </div>
              
              <p className="text-foreground mb-3">{comment.content || comment.text}</p>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-2 ${comment.likes.includes(currentUser.id) ? 'text-red-500' : ''}`}
                  onClick={() => onLikeComment(comment.id, isReply, undefined)}
                >
                  <Heart className="w-4 h-4" />
                  {comment.likes.length}
                </Button>
                


              </div>


            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-muted/50 animate-pulse">
            <div className="p-4 h-24"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 p-4 text-center">
        <p className="text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t('selection.tryAgain')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {t('selection.comments')} ({comments.length})
        </h2>
        
      </div>

      <Card className="bg-muted/30">
        <div className="p-4 space-y-2">
          <Textarea
            placeholder={t('selection.writeComment')}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] bg-background/50"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? t('selection.submitting') : t('selection.submit')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {comments.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('selection.noCommentsYet')}</p>
          </div>
        ) : (
          sortComments(comments).map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
} 