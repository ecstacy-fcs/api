export const respond = (
  res: any,
  statusCode: number,
  message?: string,
  data?: Record<string, any>
) => {
  res.status(statusCode);
  res.json({
    success: statusCode < 400,
    message,
    data,
  });
};
