export const normalizeUrlFunction = (url: string): string => {
  const parsedUrl = new URL(url);

  if (parsedUrl.pathname === '/') {
    parsedUrl.pathname = '';
  }

  return parsedUrl.toString().replace(/\/$/, '');
};
