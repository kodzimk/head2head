import  { useState } from 'react';
import { Card } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { MessageCircle, ChevronUp, ChevronLeft, Heart, Reply, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Selection, Comment } from './types';
import { mockSelections } from './mock-data';
import { Textarea } from '../../shared/ui/textarea';
import Header from '../dashboard/header';

export default function Selection() {
  const { t } = useTranslation();
  const [selections, setSelections] = useState<Selection[]>(mockSelections);
  const [votedSelections, setVotedSelections] = useState<string[]>([]);
  const [selectedSelection, setSelectedSelection] = useState<Selection | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isCommenting, setIsCommenting] = useState(false);
  const currentUser = 'You'; // In a real app, this would come from auth context

  const handleVote = (selectionId: string, team: 'A' | 'B') => {
    if (votedSelections.includes(selectionId)) return;

    setSelections(prev => prev.map(selection => {
      if (selection.id === selectionId) {
        if (team === 'A') {
          return {
            ...selection,
            teamA: {
              ...selection.teamA,
              votes: selection.teamA.votes + 1
            }
          };
        } else {
          return {
            ...selection,
            teamB: {
              ...selection.teamB,
              votes: selection.teamB.votes + 1
            }
          };
        }
      }
      return selection;
    }));

    setVotedSelections(prev => [...prev, selectionId]);
  };

  const handleAddComment = (selectionId: string, parentCommentId?: string) => {
    const comment = commentInputs[parentCommentId || selectionId];
    if (!comment?.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      content: comment,
      author: currentUser,
      likes: 0,
      timestamp: new Date().toISOString(),
      replies: [],
      likedBy: [],
      ...(parentCommentId && { parentId: parentCommentId })
    };

    setSelections(prev => prev.map(selection => {
      if (selection.id === selectionId) {
        if (parentCommentId) {
          return {
            ...selection,
            comments: selection.comments.map(comment => {
              if (comment.id === parentCommentId) {
                return {
                  ...comment,
                  replies: [newComment, ...comment.replies]
                };
              }
              return comment;
            })
          };
        } else {
          return {
            ...selection,
            comments: [newComment, ...selection.comments]
          };
        }
      }
      return selection;
    }));

    setCommentInputs(prev => ({ ...prev, [parentCommentId || selectionId]: '' }));
    setReplyingTo(null);
    if (!parentCommentId) {
      setIsCommenting(false);
    }
  };

  const handleLikeComment = (selectionId: string, commentId: string, parentCommentId?: string) => {
    setSelections(prev => prev.map(selection => {
      if (selection.id === selectionId) {
        const updateComment = (comment: Comment) => {
          if (comment.id === commentId) {
            const hasLiked = comment.likedBy.includes(currentUser);
            return {
              ...comment,
              likes: hasLiked ? comment.likes - 1 : comment.likes + 1,
              likedBy: hasLiked 
                ? comment.likedBy.filter(user => user !== currentUser)
                : [...comment.likedBy, currentUser]
            };
          }
          return comment;
        };

        if (parentCommentId) {
          return {
            ...selection,
            comments: selection.comments.map(comment => {
              if (comment.id === parentCommentId) {
                return {
                  ...comment,
                  replies: comment.replies.map(updateComment)
                };
              }
              return comment;
            })
          };
        } else {
          return {
            ...selection,
            comments: selection.comments.map(updateComment)
          };
        }
      }
      return selection;
    }));
  };

  const renderComment = (comment: Comment, selectionId: string, isReply = false) => (
    <Card key={comment.id} className={`bg-muted/50 ${isReply ? 'ml-8' : ''} mb-4`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">{comment.author}</span>
            {comment.author === currentUser && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {t('selection.you')}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.timestamp).toLocaleString()}
          </span>
        </div>
        <p className="text-foreground mb-3">{comment.content}</p>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${comment.likedBy.includes(currentUser) ? 'text-red-500' : ''}`}
            onClick={() => handleLikeComment(selectionId, comment.id, isReply ? comment.parentId : undefined)}
          >
            <Heart className="w-4 h-4" />
            {comment.likes}
          </Button>
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              <Reply className="w-4 h-4" />
              {t('selection.reply')}
            </Button>
          )}
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div className="mt-4 space-y-2">
            <Textarea
              placeholder={t('selection.writeReply')}
              value={commentInputs[comment.id] || ''}
              onChange={(e) => setCommentInputs(prev => ({ ...prev, [comment.id]: e.target.value }))}
              className="min-h-[80px] bg-background/50"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  setCommentInputs(prev => ({ ...prev, [comment.id]: '' }));
                }}
              >
                {t('selection.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAddComment(selectionId, comment.id)}
                disabled={!commentInputs[comment.id]?.trim()}
              >
                {t('selection.reply')}
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l-2 border-border pl-4">
            {comment.replies.map(reply => renderComment(reply, selectionId, true))}
          </div>
        )}
      </div>
    </Card>
  );


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-gaming py-6">
        {selectedSelection ? (
          // Detailed View
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => setSelectedSelection(null)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('selection.backToList')}
            </Button>

            <Card className="overflow-hidden bg-card/50 backdrop-blur-sm">
              <div className="p-6 space-y-6">
                {/* Category */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{t('selection.title')}</h2>
                  <span className="text-sm font-medium text-primary px-3 py-1.5 rounded-full bg-primary/10">
                    {t(`selection.categories.${selectedSelection.category}`)}
                  </span>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Team A */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedSelection.teamA.image}
                        alt={selectedSelection.teamA.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-border aspect-square"
                      />
                      <div>
                        <h3 className="text-xl font-bold">{selectedSelection.teamA.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedSelection.teamA.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleVote(selectedSelection.id, 'A')}
                        disabled={votedSelections.includes(selectedSelection.id)}
                        variant="outline"
                        size="lg"
                        className="flex-1 bg-background/50"
                      >
                        <ChevronUp className="w-5 h-5 mr-2" />
                        <span className="flex-1">{selectedSelection.teamA.votes}</span>
                        <span className="ml-2">{t('selection.votes')}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedSelection.teamB.image}
                        alt={selectedSelection.teamB.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-border aspect-square"
                      />
                      <div>
                        <h3 className="text-xl font-bold">{selectedSelection.teamB.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedSelection.teamB.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleVote(selectedSelection.id, 'B')}
                        disabled={votedSelections.includes(selectedSelection.id)}
                        variant="outline"
                        size="lg"
                        className="flex-1 bg-background/50"
                      >
                        <ChevronUp className="w-5 h-5 mr-2" />
                        <span className="flex-1">{selectedSelection.teamB.votes}</span>
                        <span className="ml-2">{t('selection.votes')}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="h-2.5 bg-[#1A1B1E] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF6B00] transition-all duration-300"
                      style={{
                        width: `${(selectedSelection.teamA.votes / (selectedSelection.teamA.votes + selectedSelection.teamB.votes)) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#FF6B00]">
                      {Math.round((selectedSelection.teamA.votes / (selectedSelection.teamA.votes + selectedSelection.teamB.votes)) * 100)}%
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round((selectedSelection.teamB.votes / (selectedSelection.teamA.votes + selectedSelection.teamB.votes)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">{t('selection.comments')}</h3>
                      <span className="text-sm text-muted-foreground">
                        ({selectedSelection.comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCommenting(!isCommenting)}
                      className="gap-2"
                    >
                      {isCommenting ? (
                        <>
                          <X className="w-4 h-4" />
                          {t('selection.cancel')}
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-4 h-4" />
                          {t('selection.addComment')}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Add Comment */}
                  {isCommenting && (
                    <Card className="bg-muted/30">
                      <div className="p-4 space-y-2">
                        <Textarea
                          placeholder={t('selection.writeComment')}
                          value={commentInputs[selectedSelection.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [selectedSelection.id]: e.target.value }))}
                          className="min-h-[100px] bg-background/50"
                          autoFocus
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleAddComment(selectedSelection.id)}
                            variant="default"
                            disabled={!commentInputs[selectedSelection.id]?.trim()}
                          >
                            {t('selection.submit')}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Comments List */}
                  <div className="space-y-4 mt-6">
                    {selectedSelection.comments.map(comment => renderComment(comment, selectedSelection.id))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          // Selection List
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">{t('selection.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selections.map(selection => (
                <Card
                  key={selection.id}
                  className="overflow-hidden bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedSelection(selection)}
                >
                  <div className="p-4">
                    {/* Category */}
                    <div className="text-sm font-medium text-muted-foreground capitalize mb-4">
                      {t(`selection.categories.${selection.category}`)}
                    </div>

                    {/* Teams */}
                    <div className="space-y-4">
                      {/* Team A */}
                      <div className="flex items-center gap-3">
                        <img
                          src={selection.teamA.image}
                          alt={selection.teamA.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border aspect-square ring-2 ring-offset-2 ring-offset-background ring-border/50"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{selection.teamA.name}</div>
                          <div className="flex items-center gap-2">
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{selection.teamA.votes} {t('selection.votes')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="h-2.5 bg-[#1A1B1E] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FF6B00] transition-all duration-300"
                            style={{
                              width: `${(selection.teamA.votes / (selection.teamA.votes + selection.teamB.votes)) * 100}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-[#FF6B00]">
                            {Math.round((selection.teamA.votes / (selection.teamA.votes + selection.teamB.votes)) * 100)}%
                          </span>
                          <span className="text-muted-foreground">
                            {Math.round((selection.teamB.votes / (selection.teamA.votes + selection.teamB.votes)) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Team B */}
                      <div className="flex items-center gap-3">
                        <img
                          src={selection.teamB.image}
                          alt={selection.teamB.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border aspect-square ring-2 ring-offset-2 ring-offset-background ring-border/50"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{selection.teamB.name}</div>
                          <div className="flex items-center gap-2">
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{selection.teamB.votes} {t('selection.votes')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ChevronUp className="w-4 h-4" />
                          {selection.teamA.votes + selection.teamB.votes} {t('selection.totalVotes')}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {selection.comments.length} {t('selection.comments')}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 