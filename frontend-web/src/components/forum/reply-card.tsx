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

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
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
  const avatarColor = getAvatarColor(reply.author.name);

  return (
    <div className="bg-white rounded-xl border border-gray-200 transition-all duration-200 hover:border-gray-300">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${avatarColor}`}>
              <span className="text-sm font-bold">
                {reply.author.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-900">{reply.author.name}</span>
              <span className="text-xs text-gray-400 ml-2">
                {formatDistanceToNow(new Date(reply.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(reply)}
                    className="cursor-pointer text-sm"
                  >
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(reply.id)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-sm"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Deletar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <div className="pl-12">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {reply.content}
          </p>

          {/* Vote Buttons */}
          <div className="mt-3 pt-3 border-t border-gray-100">
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
    </div>
  );
}
