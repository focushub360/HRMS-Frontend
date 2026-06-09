export const formatWorkingHours = (hours, options = {}) => {
  const { emptyValue = '--' } = options;
  const num = Number(hours || 0);

  if (!Number.isFinite(num) || num <= 0) return emptyValue;

  const totalMinutes = Math.round(num * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${wholeHours}h ${minutes}m`;
};
