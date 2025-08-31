export const generateTeamCode = (length = 8) => {
  const CHARS = "ACFHJKLPRTUVXY24579";
  let code = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CHARS.length);
    code += CHARS[idx];
  }
  return code;
};

