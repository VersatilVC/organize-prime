import React, { memo } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { User } from '@/types/api';
import { useAvatarCache } from '@/hooks/useImageCache';

interface UserTableRowProps {
  user: User;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onAction: (action: string) => void;
}

export const UserTableRow = memo(({
  user,
  selected,
  onSelect,
  onAction
}: UserTableRowProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'super_admin':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  const { src: avatarSrc } = useAvatarCache(user.avatar_url || undefined);

  return (
    <TableRow className={selected ? 'bg-muted/50' : ''}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          aria-label={`Select ${user.full_name}`}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarSrc || undefined} alt={user.full_name} />
            <AvatarFallback className="text-xs">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.full_name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {user.role || 'User'}
        </Badge>
      </TableCell>
      <TableCell>{user.department || '-'}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(user.status || 'inactive')}>
          {user.status || 'inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        {user.lastLoginAt ? (
          <span className="text-sm">
            {formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Never</span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction('view')}>
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('edit')}>
              Edit User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onAction('remove')}
              className="text-destructive focus:text-destructive"
            >
              Remove User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

UserTableRow.displayName = 'UserTableRow';