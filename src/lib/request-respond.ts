export const respond = (
  res: any,
  statusCode: number,
  message?: string,
  data?: Record<string, any>,
  clearCookie?: boolean
) => {
  try {
    res.status(statusCode);
    if (clearCookie) res.clearCookie(process.env.SESSION_NAME);
    res.json({
      success: statusCode < 400,
      message,
      data,
    });
  } catch (err) {}
};
