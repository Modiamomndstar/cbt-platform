/**
 * Utility to safely format dates and avoid "Invalid Date"
 */
export const formatDate = (dateInput: any, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!dateInput) return '-';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    return '-';
  }
};

export const formatDateTime = (dateInput: any, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!dateInput) return '-';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString(undefined, {
      ...options,
      hour: options.hour || '2-digit',
      minute: options.minute || '2-digit',
    });
  } catch (error) {
    return '-';
  }
};
