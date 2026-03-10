/**
 * Utility to safely format dates and avoid "Invalid Date"
 */
export const formatDate = (dateInput: any, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!dateInput) return '-';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });
  } catch (error) {
    return '-';
  }
};

/**
 * Formats a time range based on ISO strings.
 * Result: "1:22 PM - 2:22 PM" (Localized)
 */
export const formatTimeRange = (startIso: string | null, endIso: string | null): string => {
  if (!startIso) return '-';

  try {
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return '-';

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    const startStr = start.toLocaleTimeString(undefined, timeOptions);

    if (!endIso) return startStr;

    const end = new Date(endIso);
    if (isNaN(end.getTime())) return startStr;

    const endStr = end.toLocaleTimeString(undefined, timeOptions);

    return `${startStr} - ${endStr}`;
  } catch (error) {
    return '-';
  }
};

export const formatTime = (dateInput: any, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!dateInput) return '-';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options,
    });
  } catch (error) {
    return '-';
  }
};

/**
 * Safely formats a raw time string (HH:mm or HH:mm:ss) into a localized time string (e.g., 1:22 PM).
 */
export const formatTimeString = (timeStr: string | null, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!timeStr) return '-';

  try {
    // We create a dummy date to parse the time string safely
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
    
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(seconds);

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options,
    });
  } catch (error) {
    return '-';
  }
};
