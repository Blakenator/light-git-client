import React, { useMemo } from 'react';
import styled from 'styled-components';

const AgeSpan = styled.span<{ $ageType?: 'recent' | 'recentSecondary' | 'old' | 'default' }>`
  font-size: 0.875rem;
  color: ${({ $ageType, theme }) => {
    switch ($ageType) {
      case 'recent':
        return theme.colors.ageRecent;
      case 'recentSecondary':
        return theme.colors.ageRecentSecondary;
      case 'old':
        return theme.colors.ageOld;
      default:
        return theme.colors.secondary;
    }
  }};
`;

interface AgeInfoProps {
  date: Date | string | number;
  className?: string;
}

const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffWeeks < 5) {
    return `${diffWeeks}w`;
  } else if (diffMonths < 12) {
    return `${diffMonths}mo`;
  } else {
    return `${diffYears}y`;
  }
};

const getAgeType = (date: Date): 'recent' | 'recentSecondary' | 'old' | 'default' => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return 'recent'; // Green - very recent
  } else if (diffDays < 7) {
    return 'recentSecondary'; // Blue - recent
  } else if (diffDays < 30) {
    return 'default'; // Default color - somewhat old
  } else {
    return 'old'; // Gray - old
  }
};

export const AgeInfo: React.FC<AgeInfoProps> = ({ date, className }) => {
  const dateObj = useMemo(() => {
    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
    if (date == null || date === '') return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }, [date]);

  const relativeTime = useMemo(() => (dateObj ? getRelativeTime(dateObj) : '—'), [dateObj]);
  const ageType = useMemo(() => (dateObj ? getAgeType(dateObj) : 'default'), [dateObj]);

  const fullDate = dateObj ? dateObj.toLocaleString() : '';

  return (
    <AgeSpan className={className} $ageType={ageType} title={fullDate}>
      {relativeTime}
    </AgeSpan>
  );
};

export default AgeInfo;
