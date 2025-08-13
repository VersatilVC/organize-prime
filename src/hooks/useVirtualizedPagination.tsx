import { useState, useCallback, useMemo } from 'react';

interface UseVirtualizedPaginationProps {
  totalItems: number;
  itemsPerPage: number;
  initialPage?: number;
}

interface VirtualizedPaginationReturn {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrevious: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  getPageNumbers: () => number[];
}

export function useVirtualizedPagination({
  totalItems,
  itemsPerPage,
  initialPage = 0
}: UseVirtualizedPaginationProps): VirtualizedPaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const hasNext = currentPage < totalPages - 1;
  const hasPrevious = currentPage > 0;

  const goToPage = useCallback((page: number) => {
    const clampedPage = Math.max(0, Math.min(page, totalPages - 1));
    setCurrentPage(clampedPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNext]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevious]);

  const goToFirst = useCallback(() => {
    setCurrentPage(0);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentPage(totalPages - 1);
  }, [totalPages]);

  const getPageNumbers = useCallback(() => {
    const delta = 2; // Show 2 pages before and after current page
    const range = [];
    const rangeWithDots = [];

    // Calculate range
    const start = Math.max(0, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Add first page and dots if needed
    if (start > 0) {
      rangeWithDots.push(0);
      if (start > 1) {
        rangeWithDots.push(-1); // -1 represents dots
      }
    }

    // Add main range
    rangeWithDots.push(...range);

    // Add last page and dots if needed
    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        rangeWithDots.push(-1); // -1 represents dots
      }
      rangeWithDots.push(totalPages - 1);
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  return useMemo(() => ({
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    hasNext,
    hasPrevious,
    goToPage,
    nextPage,
    previousPage,
    goToFirst,
    goToLast,
    getPageNumbers
  }), [
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    hasNext,
    hasPrevious,
    goToPage,
    nextPage,
    previousPage,
    goToFirst,
    goToLast,
    getPageNumbers
  ]);
}