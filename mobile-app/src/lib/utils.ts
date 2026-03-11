export const formatDate = (dateString: string | Date) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

export const formatTime = (dateString: string | Date) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return '';
  }
};

export const getExamLabel = (isCompetition: boolean) => {
  return isCompetition ? 'Competition' : 'Assessment';
};

export const getRulesTitle = (isCompetition: boolean) => {
  return isCompetition ? 'Competition Rules' : 'CBT Assessment Rules';
};
