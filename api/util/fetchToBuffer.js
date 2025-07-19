export const fetchToBuffer = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
