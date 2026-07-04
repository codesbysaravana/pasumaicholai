import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    siblingsCount?: number;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    siblingsCount = 1
}: PaginationProps) {
    if (totalPages <= 1) return null;

    // Generate page numbers array with ellipses logic
    const generatePagination = () => {
        const firstPage = 1;
        const lastPage = totalPages;

        const leftSiblingIndex = Math.max(currentPage - siblingsCount, firstPage);
        const rightSiblingIndex = Math.min(currentPage + siblingsCount, lastPage);

        const shouldShowLeftDots = leftSiblingIndex > firstPage + 1;
        const shouldShowRightDots = rightSiblingIndex < lastPage - 1;

        const pageNumbers: (number | string)[] = [];

        pageNumbers.push(firstPage);

        if (shouldShowLeftDots) {
            pageNumbers.push('leftEllipsis');
        }

        for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
            if (i !== firstPage && i !== lastPage) {
                pageNumbers.push(i);
            }
        }

        if (shouldShowRightDots) {
            pageNumbers.push('rightEllipsis');
        }

        if (lastPage !== firstPage) {
            pageNumbers.push(lastPage);
        }

        return pageNumbers;
    };

    const pageNumbers = generatePagination();

    const itemVariants = {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -5 },
        hover: { scale: 1.1, transition: { duration: 0.2 } },
    };

    return (
        <nav className="pagination-container" aria-label="Pagination Navigation">
            <motion.button
                type="button"
                className="pagination-btn pagination-nav-btn"
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                whileHover={currentPage > 1 ? "hover" : ""}
                whileTap={currentPage > 1 ? { scale: 0.95 } : ""}
                variants={itemVariants}
                initial="initial"
                animate="animate"
            >
                <ChevronLeft size={16} />
            </motion.button>

            <div className="pagination-pages-list">
                {pageNumbers.map((page, index) => {
                    if (page === 'leftEllipsis' || page === 'rightEllipsis') {
                        return (
                            <div key={`ellipsis-${index}`} className="pagination-dots">
                                <MoreHorizontal size={14} />
                            </div>
                        );
                    }

                    const pageNum = page as number;
                    const isActive = pageNum === currentPage;

                    return (
                        <motion.button
                            key={pageNum}
                            type="button"
                            className={`pagination-page-btn ${isActive ? 'active' : ''}`}
                            onClick={() => onPageChange(pageNum)}
                            variants={itemVariants}
                            initial="initial"
                            animate="animate"
                            whileHover="hover"
                            whileTap={{ scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            {pageNum}
                        </motion.button>
                    );
                })}
            </div>

            <motion.button
                type="button"
                className="pagination-btn pagination-nav-btn"
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                whileHover={currentPage < totalPages ? "hover" : ""}
                whileTap={currentPage < totalPages ? { scale: 0.95 } : ""}
                variants={itemVariants}
                initial="initial"
                animate="animate"
            >
                <ChevronRight size={16} />
            </motion.button>
        </nav>
    );
}
