/**
 * Shared formatting utilities for display values across overview screens.
 */

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#30D158';
    case 'in_progress': return '#FF9500';
    case 'planned': return '#8E8E93';
    case 'active': return '#FF453A';
    case 'cleared': return '#30D158';
    default: return '#8E8E93';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'in_progress': return 'In Progress';
    case 'planned': return 'Planned';
    case 'active': return 'Active';
    case 'cleared': return 'Cleared';
    default: return status;
  }
}
