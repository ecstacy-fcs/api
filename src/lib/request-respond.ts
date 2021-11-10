export const respond = (
  res: any,
  req: any,
  statusCode: number,
  message?: string,
  data?: Record<string, any>,
  clearCookie?: boolean,
  clearSession?: boolean
) => {
  try {
    res.status(statusCode);
    if (clearCookie) res.clearCookie(process.env.SESSION_NAME);
    res.json({
      success: statusCode < 400,
      message,
      data,
      csrfToken: clearSession ? "" : req.csrfToken(),
    });
  } catch (err) {}
};
