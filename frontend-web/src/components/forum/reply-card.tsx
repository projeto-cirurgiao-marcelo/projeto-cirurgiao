'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VoteButtons } from './vote-buttons';
import type { ForumReply } from '@/lib/types/forum.types';

interface ReplyCardProps {
  reply: ForumReply;
  currentUserId?: string;
  isAdmin?: boolean;
  onEdit?: (reply: ForumReply) => void;
  onDelete?: (replyId: string) => void;
  onVoteChange?: () => void;
}

export function ReplyCard({
  reply,
  currentUserId,
  isAdmin = false,
  onEdit,
  onDelete,
  onVoteChange,
}: ReplyCardProps) {
  const isAuthor = currentUserId === reply.authorId;
  const canEdit = isAuthor || isAdmin;

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-sm transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary-700">
                {reply.author.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Author info */}
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900">{reply.author.name}</span>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(reply.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>

          {/* Menu de ações */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem 
                    onClick={() => onEdit(reply)}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(reply.id)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Conteúdo da resposta */}
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {reply.content}
          </p>
        </div>

        {/* Botões de voto */}
        <div className="flex items-center pt-4 border-t border-gray-100">
          <VoteButtons
            type="reply"
            id={reply.id}
            initialUpvotes={0}
            initialDownvotes={0}
            onVoteChange={onVoteChange}
          />
        </div>
      </div>
    </div>
  );
}
